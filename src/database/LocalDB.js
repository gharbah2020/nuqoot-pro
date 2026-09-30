// ===== UPDATE (EDIT) FUNCTIONS =====
export const updateEvent = async (id, name, type, date, location, notes) => {
  const d = await getDB();
  await d.runAsync(
    `UPDATE events SET name=?, type=?, date=?, location=?, notes=? WHERE id=?`,
    [name, type, date, location || '', notes || '', id]
  );
};

export const updateNuqoot = async (id, person_name, amount, phone, relation, address, notes) => {
  const d = await getDB();
  await d.runAsync(
    `UPDATE nuqoot SET person_name=?, amount=?, phone=?, relation=?, address=?, notes=? WHERE id=?`,
    [person_name, amount, phone || '', relation || '', address || '', notes || '', id]
  );
};
// ===== UPDATE (EDIT) FUNCTIONS =====
export const updateEvent = async (id, name, type, date, location, notes) => {
  const d = await getDB();
  await d.runAsync(
    `UPDATE events SET name=?, type=?, date=?, location=?, notes=? WHERE id=?`,
    [name, type, date, location || '', notes || '', id]
  );
};

export const updateNuqoot = async (id, person_name, amount, phone, relation, address, notes) => {
  const d = await getDB();
  await d.runAsync(
    `UPDATE nuqoot SET person_name=?, amount=?, phone=?, relation=?, address=?, notes=? WHERE id=?`,
    [person_name, amount, phone || '', relation || '', address || '', notes || '', id]
  );
};