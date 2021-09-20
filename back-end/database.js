export const execute = async (client, callback) => {
  let session = null;
  try {
    session = await client.getSession();
    return await callback(session);
  } finally {
    await close(session);
  }
};

export const close = async resource => {
  try {
    await resource?.close();
  } catch (e) {
    console.error(e);
  }
};

export const mapRows = result => {
  const rows = result.fetchAll();
  const columns = result.getColumns();

  return rows.map(row => Object.fromEntries(
    row.map((o, idx) => [columns[idx].getColumnLabel(), o])
  ));
};
