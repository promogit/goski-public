const express = require('express');
const axios = require('axios');
const app = express();
const db = require('../db');
const forfaitHash = require('../scripts/forfaitHash');
const dayjs = require('dayjs');

const IN_TOKEN = process.env.IN_TOKEN || 'nffjdbfdsjfbdsjert'

const checkValidity = async (day, pass) => {
  //return {valid: true, fraudulent: false, firstname: "Jonh", lastname: "Doe", birthdate: "18-07-1991"};

  let type = 'DCC';
  if(pass.startsWith('DC')) {
    type = '2D-DOC';
  }
  
  let controlDate = dayjs(day).toISOString().split('.')[0];
  var config = {
    method: 'post',
    url: `https://portail.ppd.tacv.myservices-ingroupe.com/api/document/${type}?controlDate=${controlDate}`,
    headers: {
      'Authorization': `Bearer ${IN_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    data : string
  };
  let {data} = await axios(config);
  let valid = data.data.dynamic[0].liteVaccinePassValidityStatus == "Valide";
  let firstname = data.data.dynamic[0].liteFirstName == "Valide";
  let lastname = data.data.dynamic[0].liteLastName == "Valide";
  let birthdate = data.data.dynamic[0].liteDateOfBirth == "Valide";

  let fraudulent = data.data.static.isBlacklisted;
  return {valid, fraudulent, firstname, lastname, birthdate};
}

app.post('/', express.json(), express.query(), async (req, res) => {
  const { forfait, pass, exemptionAge, dates } = req.body;

  if(!forfaitHash.check(forfait, forfait.hash)) {
    res.status(400).json({
      error: 'Invalid forfait payload',
    });
  }
  const validDays = [];
  let hasInvalidDay = false;

  let dayjsDates = dates.map(date => dayjs(date));
  let fraud = false;
  for (let i = 0; i < dayjsDates.length; i++) {
    const day = dayjsDates[i];
    if(day.isSame(dayjs(), 'd') && dayjs().get('hour') < 9) {
      day.set('hour', 9).set('minute', 0).set('second', 0);
    }
    let start = new Date().getTime();
    try {
      var {valid, fraudulent, firstname, lastname, birthdate} = await checkValidity(day, pass);

    } catch(err) {
      console.log(JSON.stringify({
        key: "checkpassforfait-tacvapi-error",
        error: err.message,
        status: error.response && error.response.status,
      }))
      return res.status(503).send();
    }
    let end = new Date().getTime();
    fraud = fraudulent;

    console.log(JSON.stringify({
      key: "checkpassforfait",
      mediaId: forfait.mediaId,
      forfaitId: forfait.forfaitId,
      supportId: forfait.supportId,
      resortId: forfait.resortId,
      response_time: end - start,
      day: day.format("YYYY-MM-DD")
    }))

    if(valid) {
      validDays.push(day.toISOString());
      try {
        await db.insertForfait({
          mediaId: forfait.mediaId,
          forfaitId: forfait.forfaitId,
          supportId: forfait.supportId,
          resortId: forfait.resortId,
          dateValidity: day.set('hour', 9).toISOString(),
          firstname,
          lastname,
          birthdate,
        })
      } catch(err) {
        console.log(err);
        console.log(JSON.stringify({key: "err-bdd-checkpassforfait"}));
      }
    } else {
      hasInvalidDay = true;
    }
  }
  res.send({validDays, hasInvalidDay, fraudulent: fraud});
})

module.exports = app
