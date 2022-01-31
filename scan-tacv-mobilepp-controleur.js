
async function tacvApi(pass) {
  const url = `${baseUrl}/api/checkpass/?device=${deviceCode}`;
  let {data} = await axios.post(url, {pass});
  return data;
}

const onSuccessQRreader = async (data) => {
  countControl();
  console.log(data);
  scanditRef.current.stopCapture();

  if(!data.startsWith("HC1:")) {
    setPassState("invalidQR");
    setForcePassRead(false);
    return;
  }

  let controlResult = await tacvApi(data);
  console.log(controlResult);
  if(controlResult.valid) {
    setName(controlResult.firstname + " " + controlResult.lastname);
    setBirthdate(controlResult.birthdate);
    setPassState("validQR");
  } else {
    setPassState("invalidQR");
  }
  setForcePassRead(false);
};
