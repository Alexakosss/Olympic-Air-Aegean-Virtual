export const extractVatsimCID = (name: string): number => {
  // User has no name |-cid-|
  if (name.startsWith("|-") && name.endsWith("-|")) {
    const idStr = name.substring(2).substring(0, 7);
    const id = Number(idStr);
    if (Number.isNaN(idStr)) {
      throw new Error(`Invalid VATSIM ID: ${idStr}`);
    }
    return id;
  }

  // Use has a name, we split on last dash (-)
  const indexOfDash = name.lastIndexOf("-");

  if (indexOfDash < 0) {
    throw new Error(`Invalid VATSIM name: ${name}`);
  }

  // trim dash and space
  const idStr = name.substring(indexOfDash + 2);
  const id = Number(idStr);

  if (Number.isNaN(idStr)) {
    throw new Error(`Invalid VATSIM id: ${idStr}`);
  }

  return id;
};

export const removeVatsimCIDFromName = (name: string): string => {
  if (name.startsWith("|-") && name.endsWith("-|")) {
    return "";
  }
  return name.substring(0, name.lastIndexOf("-") - 1);
};
