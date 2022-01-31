const express = require('express');
const axios = require('axios');
const app = express();
const db = require('../db');
const forfaitHash = require('../scripts/forfaitHash');
const dayjs = require('dayjs');

const IN_TOKEN = process.env.IN_TOKEN || 'nffjdbfdsjfbdsjert'

const checkValidity = async (pass) => {
  //return {valid: true, fraudulent: false, firstname: "Michelle", lastname: "Janir", birthdate: "19-06-1981"};

  let type = 'DCC';
  if(pass.startsWith('DC')) {
    type = '2D-DOC';
  }
  let controlDate = dayjs(day).toISOString().split('.')[0];
  var config = {
    method: 'post',
    url: `https://portail.ppd.tacv.myservices-ingroupe.com/api/document/${type}`,
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
  const { pass } = req.body;

  let start = new Date().getTime();
  try {
    let {valid, fraudulent, firstname, lastname, birthdate} = await checkValidity(pass);
      
    let end = new Date().getTime();
    
    console.log(JSON.stringify({
      key: "tacv-api",
      response_time: end - start,
      status: 200,
    }));

    console.log(JSON.stringify({
      key: "checkpass",
      valid,
      fraudulent,
      device: req.query.device,
    }))
    res.send({valid, fraudulent, firstname, lastname, birthdate});
  } catch(err) {
    let end = new Date().getTime();

    if(err.response) {
      console.log(JSON.stringify({
        key: "tacv-api",
        response_time: end - start,
        status: err.response.status,
        error: true,
      }));
    } else {
      console.log(JSON.stringify({
        key: "tacv-api",
        response_time: end - start,
        error: true,
      }));
    }

    res.sendStatus(501);
  }
})

module.exports = app
