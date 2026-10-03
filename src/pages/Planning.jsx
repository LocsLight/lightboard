import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import fr from "date-fns/locale/fr";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "../lib/supabaseClient";

const locales = { fr };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: fr }),
  getDay,
  locales,
});

const messages = {
  next: "Suivant",
  previous: "Précédent",
  today: "Aujourd'hui",
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  agenda: "Agenda",
  noEventsInRange: "Aucun événement sur cette période.",
};

const EVENT_COLORS = [
  { name: "Blanc", value: "#ffffff" },
  { name: "Vert", value: "#22c55e" },
  { name: "Orange", value: "#f97316" },
];
const DEFAULT_EVENT_COLOR = EVENT_COLORS[0].value;

const getEventTextColor = (color) => {
  const hex = color.replace("#", "");
  const channels = [0, 2, 4].map((index) =>
    parseInt(hex.slice(index, index + 2), 16) / 255
  );
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];

  return luminance > 0.5 ? "#000000" : "#ffffff";
};

export default function Planning() {
  const [items, setItems] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(DEFAULT_EVENT_COLOR);
  const [formError, setFormError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.MONTH);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("planning_items")
      .select("*")
      .order("date", { ascending: true });
    if (error) console.error(error);
    else setItems(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const events = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        start: new Date(item.date),
        end: new Date(item.date),
        allDay: true,
        resource: item,
      })),
    [items]
  );

  // Clic sur une case vide du calendrier : ouvre le petit formulaire d'ajout
  const handleSelectSlot = ({ start }) => {
    setEditingItem(null);
    setSelectedSlot(start);
    setTitle("");
    setColor(DEFAULT_EVENT_COLOR);
    setFormError("");
  };

  const closeForm = useCallback(() => {
    setSelectedSlot(null);
    setEditingItem(null);
    setTitle("");
    setColor(DEFAULT_EVENT_COLOR);
    setFormError("");
  }, []);

  useEffect(() => {
    if (!selectedSlot && !editingItem) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeForm();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSlot, editingItem, closeForm]);

  const saveItem = async (e) => {
    e.preventDefault();
    if (!title.trim() || (!selectedSlot && !editingItem)) return;
    setFormError("");

    const result = editingItem
      ? await supabase
          .from("planning_items")
          .update({ title: title.trim(), color })
          .eq("id", editingItem.id)
      : await supabase.from("planning_items").insert({
          title: title.trim(),
          date: format(selectedSlot, "yyyy-MM-dd"),
          color,
        });

    const { error } = result;
    if (error) {
      console.error(error);
      const errorMessage = `${error.message} ${error.details || ""}`;
      if (
        (error.code === "PGRST204" || error.code === "42703") &&
        errorMessage.toLowerCase().includes("color")
      ) {
        setFormError(
          "La colonne de couleur manque dans la base de données. Appliquez la migration Supabase avant d’enregistrer des évènements."
        );
      } else {
        setFormError("L’évènement n’a pas pu être enregistré. Réessayez.");
      }
    }
    else {
      closeForm();
      load();
    }
  };

  const deleteItem = async () => {
    if (!editingItem) return;
    setFormError("");

    const { error } = await supabase
      .from("planning_items")
      .delete()
      .eq("id", editingItem.id);
    if (error) {
      console.error(error);
      setFormError("L’évènement n’a pas pu être supprimé. Réessayez.");
    }
    else {
      closeForm();
      load();
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedSlot(null);
    setEditingItem(event.resource);
    setTitle(event.resource.title);
    setColor(event.resource.color || DEFAULT_EVENT_COLOR);
    setFormError("");
  };

  const formIsOpen = Boolean(selectedSlot || editingItem);
  const selectedDate = editingItem
    ? parse(editingItem.date, "yyyy-MM-dd", new Date())
    : selectedSlot;

  return (
    <section className="planning-page">
      <h1>Planning</h1>

      <div className="planning-calendar">
        <Calendar
          localizer={localizer}
          culture="fr"
          messages={messages}
          events={events}
          startAccessor="start"
          endAccessor="end"
          tooltipAccessor="title"
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={(event) => {
            const eventColor = event.resource.color || DEFAULT_EVENT_COLOR;
            return {
              style: {
                backgroundColor: eventColor,
                color: getEventTextColor(eventColor),
              },
            };
          }}
          date={currentDate}
          view={currentView}
          onNavigate={(date) => setCurrentDate(date)}
          onView={(view) => setCurrentView(view)}
          style={{ height: 650 }}
        />
      </div>

      {formIsOpen && (
        <div
          className="planning__modal"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <form
            className="planning__form"
            onSubmit={saveItem}
            role="dialog"
            aria-modal="true"
            aria-labelledby="planning-form-title"
          >
            <h2 id="planning-form-title">
              {editingItem ? "Modifier l’événement" : "Nouvel événement"}
            </h2>
            <p className="planning__form-date">
              Le {format(selectedDate, "d MMMM yyyy", { locale: fr })}
            </p>
            <input
              type="text"
              placeholder="Titre de l'événement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
            {formError && (
              <p className="planning__form-error" role="alert">
                {formError}
              </p>
            )}
            <fieldset className="planning__form-color">
              <legend>Couleur</legend>
              <div className="planning__color-options">
                {EVENT_COLORS.map((option) => (
                  <label
                    className={`planning__color-option${color === option.value ? " planning__color-option--selected" : ""}`}
                    key={option.value}
                  >
                    <input
                      type="radio"
                      name="planning-event-color"
                      value={option.value}
                      checked={color === option.value}
                      onChange={() => setColor(option.value)}
                    />
                    <span className="planning__color-swatch-wrap" aria-hidden="true">
                      <span
                        className="planning__color-swatch"
                        style={{ backgroundColor: option.value }}
                      />
                    </span>
                    <span>{option.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="planning__form-actions">
              <button type="submit">
                {editingItem ? "Enregistrer" : "Ajouter"}
              </button>
              {editingItem && (
                <button
                  className="planning__delete-button"
                  type="button"
                  onClick={deleteItem}
                >
                  Supprimer
                </button>
              )}
              <button type="button" onClick={closeForm}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
