const { Pool } = require('pg');

const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT;
const DB_SSL = process.env.DB_SSL;

const pool = new Pool({
  user: DB_USER,
  host: DB_HOST,
  database: DB_NAME,
  password: DB_PASSWORD,
  port: DB_PORT,
  ssl: (DB_SSL == "true")?{ rejectUnauthorized: false }:false
});

// TODO
const deleteOutdatedForfaits = async() => {
  try {
    const DEL_REQUEST = `
DELETE
FROM forfaits
WHERE date_validity < CURRENT_DATE;
    `
    await pool.query(DEL_REQUEST);
  } catch(err) { 
    console.log(err);
  }
}
// One record per day, even for a X days "forfaits"
const init = async () => {
  console.log("INIT FUNCTION");
  const INIT_REQUEST = `
CREATE TABLE IF NOT EXISTS "forfaits" (
  id BIGSERIAL,
  media_id VARCHAR(16),
  support_id VARCHAR(100),
  forfait_id VARCHAR(100),
  resort_id VARCHAR(50),
  date_validity DATE,
  firstname VARCHAR(200),
  lastname VARCHAR(200),
  birthdate VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(forfait_id, date_validity)
);

ALTER TABLE forfaits ADD COLUMN IF NOT EXISTS firstname VARCHAR(200);
ALTER TABLE forfaits ADD COLUMN IF NOT EXISTS lastname VARCHAR(200);
ALTER TABLE forfaits ADD COLUMN IF NOT EXISTS birthdate VARCHAR(200);

CREATE TABLE IF NOT EXISTS "codeapp" (
  id BIGSERIAL,
  device_id VARCHAR(200),
  code VARCHAR(50) NOT NULL,
  PRIMARY KEY(code)
);

`;
  try {
    await pool.query(INIT_REQUEST);
    console.log("DB initialized");
  } catch(err) {
    console.log("errordb:" , err);
  }
};

const INSERT_REQUEST = `
INSERT INTO forfaits(
  media_id,
  support_id,
  forfait_id,
  resort_id,
  date_validity,
  firstname,
  lastname,
  birthdate
)
VALUES($1, $2, $3, $4, $5, $6, $7, $8);
`;
const insertForfait = ({
  mediaId,
  forfaitId,
  supportId,
  resortId,
  dateValidity,
  firstname,
  lastname,
  birthdate,
}) => {
  const params = [
    mediaId,
    supportId,
    forfaitId,
    resortId,
    dateValidity,
    firstname,
    lastname,
    birthdate,
  ];
  console.log({"insertDB": dateValidity});
  return pool.query(INSERT_REQUEST, params);
};

const CHECK_FOR_VALID_RECORD = `
  SELECT
    media_id,
    support_id,
    forfait_id,
    resort_id,
    date_validity,
    firstname,
    lastname,
    birthdate
  FROM forfaits
  WHERE (media_id = $1 OR media_id = $2) and date_validity = CURRENT_DATE;
`;
const getValidityFromMediaId = async ({
  mediaId,
}) => {
  let chunks = [];
  for (let i = 0; i < mediaId.length; i += 2) {
    chunks.push(mediaId.substring(i, i + 2));
  }
  chunks.reverse();
  
  const params = [mediaId, chunks.join('')];
  const result = await pool.query(CHECK_FOR_VALID_RECORD, params);
  return result.rows[0];
}

const RETRIEVE_FROM_FORFAIT_ID = `
SELECT
  media_id,
  forfait_id,
  support_id,
  resort_id,
  date_validity,
FROM forfaits
WHERE forfait_id = $1;
`;

const getValidityFromForfaitId = async ({
  forfaitId
}) => {
  const params = [forfaitId];
  const result = await pool.query(RETRIEVE_FROM_FORFAIT_ID, params);
  return result.rows;
}

setInterval(deleteOutdatedForfaits, 1000*60*60); // once per hour)
deleteOutdatedForfaits();

module.exports = {
  query: (text, params) => pool.query(text, params),
  deleteOutdatedForfaits,
  insertForfait,
  init,
  getValidityFromMediaId,
  getValidityFromForfaitId,
};
