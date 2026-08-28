export const toDiscordDate = (date: Date, format = "F"): string => {
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date given.");
  }
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:${format}>`;
};

export const pDate = (time: string): Date => {
  return new Date(`${time.replace(" ", "T")}:00Z`);
};

export const unix = (time: string): number => {
  return Math.floor(pDate(time).getTime() / 1000);
};

export const gDuration = (start: string, end: string): string => {
  const pDate = (value: string): Date => {
    // takes both YYYY-MM-DD HH:mm and ISO ZULU time, for any case scenario
    if (/^\d{4}-\d{2}-\d{2}T.*Z$/i.test(value)) {
      return new Date(value);
    }

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
      return new Date(value.replace(" ", "T") + ":00Z");
    }

    throw new Error(`Invalid date format: ${value}`);
  };

  const diff = pDate(end).getTime() - pDate(start).getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;

  return `${hours}h ${mins} min`;
};
