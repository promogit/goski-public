<template>
  <section>
    <modal name="wait_upload" width="270" :clickToClose="false" :adaptive="true" height="auto">
      <PopupsWaitUpload />
    </modal>
    <modal
      name="uploadfail"
      width="270px"
      :adaptive="true"
      height="auto"
    >
      <div class="uploadfail">
        <div>
          <VectorsIconClose class="closemodal" @click="closeModal('uploadfail')" />
        </div>
        <VectorsWarning /><br />
        <p>{{ $CD("UPLOAD_PASS_ERROR") }}</p>
      </div>
    </modal>

    <modal
      width="98%"
      class="modal"
      :maxWidth="462"
      :adaptive="true"
      height="98%"
      name="help"
    >
      <div class="modal_content">
        <div>
          <VectorsIconClose class="closemodal" @click="closeModal('help')" />
        </div>
        <div>
          <video controls width="100%" height="100%">
            <source
              v-if="osMobile == 'iOS'"
              autoplay
              loop
              src="/pass_guide_iphone.mp4"
              type="video/mp4"
            />
            <source
              v-else
              autoplay
              loop
              src="/guide_pass_android.mp4"
              type="video/mp4"
            />
            <p v-html="$CD('VIDEO_MISSING')"></p>
          </video>
        </div>
      </div>
    </modal>
    <modal
      name="wait"
      width="270"
      :clickToClose="false"
      :adaptive="true"
      height="auto"
    >
      <PopupsWaiting />
    </modal>
    <Header
      :route="`/station/${slug}`"
      :title="`<span>2.</span> ${$CD('STATION_STEP2')}`"
    >
      <div>
        <p class="head_steps">
          <img src="/imgs/step2.png" />
        </p>
      </div>
    </Header>
    <main class="station_info checkpass">
      <div>
        
        <h2 v-html="$CD('CHECK_PASS_DONE')"></h2>
        <div class="container-passinfo">
          <div class="photo_wrapper">
          <p class="passinfo" v-html="$CD('CHECK_PASS_INFO1')"></p>
          <img class="camera-icon" 
            src="../assets/images/icone-reverse-photo.png" 
            v-if="videoInputDevices.length > 1"
            @click="changeVideoDevice()">
        </div>
        </div>
        <div class="reader">
          <div v-if="hasCamera" class="codereader--video">
            <div v-if="cameraDisabled" class="codereader--video--text">
              {{ $CD("CAMERA_DISABLED_ERROR") }}
            </div>
            <video id="video"></video>
          </div>
          <div />
        </div>
        <p v-html="$CD('CHECK_PASS_INFO2')"></p>
        <div class="sepa">
          <div></div>
          <span>&nbsp;&nbsp;{{ $CD("CHECK_OR") }}&nbsp;&nbsp;</span>
        </div>

        <div class="btn">
          <div class="btn-left">
            <div>
              <label class="button" style="text-align: center" for="upload-photo">{{
                $CD("CHECK_PASS_BUTTON")
              }}</label>
              <input
                id="upload-photo"
                type="file"
                accept=".jpg,.jpeg,.heic,.png,application/pdf"
                name="upload document"
                max-size="20000000000"
                class="inputfile"
                @change="filechange($event)"
              />
              <span style="color:#777971;">{{ $CD("CHECK_PASS_INFO4") }}</span>
            </div>
          </div>
          <div class="btn-right">
            <div class="openHelp" @click="openHelp">
              <VectorsIconHelp />
              <p>{{ $CD("CHECK_PASS_INFO3") }}</p>
            </div>
          </div>
        </div>

        <div class="infos-sup">
          <p>{{ $CD("CHECK_PASS_INFOS_SUP") }}</p>
          
        </div>
      </div>
    </main>
    <footer>
      <FooterLinks />
    </footer>
  </section>
</template>
<script>
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

import {
  imgDataFromUrl,
  displayImageURL,
  pdfToJpegPass,
  urlsFromGenerator,
  allCanvasCrops,
} from "../scripts/image.js";

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
]);
hints.set(DecodeHintType.TRY_HARDER, true);
const codeReader = new BrowserMultiFormatReader(hints);

let interval;
let barcodeDetector;

try {
  barcodeDetector = new BarcodeDetector({
    formats: ["qr_code"],
  });
} catch (err) {
  console.log("BarcodeDetector is not supported", err);
}

export default {
  data: function () {
    return {
      osMobile: undefined,
      slug: undefined,
      hasCamera: true,
      cameraDisabled: false,
      videoInputDevices: [],
      selectedDeviceId: undefined,
      selectedDeviceIndex: undefined,
      displayProgressBar: false,
      retryable: false,
    };
  },
  async created() {
    if (!this.$store.state.stationSlug) {
      this.$router.replace("/");
      return false;
    }
    this.slug = this.$store.state.stationSlug;

    if (this.$store.state.forfait.pass) {
      this.retryable = true;
      this.$modal.show("wait");
      await this.handleQRPayload({ text: this.$store.state.forfait.pass });
      this.$modal.hide("wait");
    }
  },
  async mounted() {
    this.osMobile = this.getMobileOS();
    console.log("OS Mobile : ", this.osMobile);
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    ) {
      this.isMobileDevice = this.$store.state.lang == "fr";
    }

    await this.listVideoDevices();
    this.loaded = true;

    if (!this.hasCamera) return;

    this.start();
    console.log("ZXing code reader initialized");
    interval = setInterval(() => {
      this.listVideoDevices();
    }, 1000);
  },
  beforeDestroy() {
    codeReader.reset();
  },
  methods: {
    getMobileOS() {
      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        return "iOS";
      } else {
        return "Android";
      }
    },
    openHelp() {
      this.$modal.show("help");
    },
    closeModal(name) {
      this.$modal.hide(name);
    },
    async listVideoDevices() {
      let videoInputDevices = await codeReader.listVideoInputDevices();
      this.videoInputDevices = videoInputDevices;
      if (!videoInputDevices || !videoInputDevices[0]) {
        this.hasCamera = false;
      } else {
        let vdbackIndex = videoInputDevices.findIndex((vd) => {
          return vd.label.indexOf("ack") > -1 || vd.label.indexOf("arr") > -1;
        });
        if (vdbackIndex >= 0) {
          this.selectedDeviceId = videoInputDevices[vdbackIndex].deviceId;
          this.selectedDeviceIndex = vdbackIndex;
        } else {
          this.selectedDeviceId = videoInputDevices[0].deviceId;
          this.selectedDeviceIndex = 0;
        }
        clearInterval(interval);
      }
    },
    async changeVideoDevice() {
      codeReader.reset();
      this.selectedDeviceIndex++;
      if (this.selectedDeviceIndex == this.videoInputDevices.length) {
        this.selectedDeviceIndex = 0;
      }
      this.selectedDeviceId =
        this.videoInputDevices[this.selectedDeviceIndex].deviceId;
      this.start();
    },
    retry() {
      codeReader.reset();
      this.start();
      this.displayProgressBar = false;
    },
    async start() {
      console.log(
        `Started decode from camera with id ${this.selectedDeviceId}`
      );
      try {
        await codeReader.decodeFromVideoDevice(
          this.selectedDeviceId,
          "video",
          async (result) => {
            if (result == null) {
              return;
            }
            this.displayProgressBar = true;
            this.handleQRPayload(result);
          }
        );
      } catch (err) {
        if (err.message == "Permission denied") {
          this.cameraDisabled = true;
        }
      }
    },
    readFileBinary(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (res) => {
          resolve(res.target.result);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });
    },
    async handleQRPayload(result) {
      console.log("QR code detected");
      console.log(result.text);
      if (
        result.text.startsWith("HC1:") ||
        result.text.startsWith("EX1:") ||
        result.text.startsWith("DC")
      ) {
        try {
          const { data } = await this.$axios.post(window.location.origin + "/api/checkpassforfait", {
            forfait: this.$store.state.forfait,
            pass: result.text,
            dates: this.$store.state.datesChecked,
          });
          if (data.fraudulent) {
            this.$store.commit("updateForfaitValidDays", {
              validDays: [],
              hasInvalidDay: true,
            });
            this.$router.replace({
              path: "passnok",
              query: { fraudulent: true },
            });
          } else if (data.validDays.length > 0) {
            this.$store.commit("updateForfaitValidDays", {
              validDays: data.validDays,
              hasInvalidDay: data.hasInvalidDay,
              pass: result.text,
            });
            this.$router.replace("passok");
          } else {
            this.$store.commit("updateForfaitValidDays", {
              validDays: [],
              hasInvalidDay: true,
            });
            if (!this.retryable) {
              this.$router.replace("passnok");
            }
            this.retryable = false;
          }
        } catch (err) {
          this.$modal.show("uploadfail");
          console.log(err);
        }
      } else {
        this.$modal.show("uploadfail");
        this.retry();
      }
    },
    async filechange(event) {
      const input = event.target;

      if (input.files && input.files[0]) {
        this.$modal.show("wait_upload");
        this.displayProgressBar = true;
        var reader = new FileReader();
        reader.onloadend = async (e) => {
          try {
            if (e.target.result.indexOf("data:application/pdf") == 0) {
              this.imgType = "pdf";
              let b64data = e.target.result.replace(
                "data:application/pdf;base64,",
                ""
              );
              let pdfBinaryData = atob(b64data);
              let jpegb64 = await pdfToJpegPass(pdfBinaryData);

              let result;
              if (barcodeDetector) {
                try {
                  for (const canvas of jpegb64.canvas) {
                    const barcodes = await barcodeDetector.detect(canvas);
                    if (!barcodes || barcodes.length === 0) {
                      continue;
                    }
                    result = { format: 0, text: barcodes[0].rawValue };
                    break;
                  }
                } catch (e) {
                  this.$modal.hide("wait_upload");
                  this.$modal.show("uploadfail");
                  console.error("Barcode detection failed:", e);
                }
              } else {
                for (const jpeg of jpegb64.jpegs) {
                  try {
                    result = await codeReader.decodeFromImageUrl(jpeg);
                    break;
                  } catch (err) {
                   this.$modal.hide("wait_upload"); 
                    this.$modal.show("uploadfail");
                  }
                }
                if (!result) {
                  this.$modal.hide("wait_upload");
                  this.$modal.show("uploadfail");
                  throw new Error("Code not found");
                }
              }

              this.handleQRPayload(result);
            } else {
              this.imgType = "image";
              let result;
              for await (const imgUrl of urlsFromGenerator(
                allCanvasCrops(e.target.result)
              )) {
                try {
                  displayImageURL(imgUrl);
                  if (barcodeDetector) {
                    const img = await createImageBitmap(
                      await imgDataFromUrl(imgUrl)
                    );
                    const barcodes = await barcodeDetector.detect(img);
                    if (barcodes && barcodes.length > 0) {
                      result = { text: barcodes[0].rawValue };
                    } else {
                      continue;
                    }
                  } else {
                    result = await codeReader.decodeFromImageUrl(imgUrl);
                  }
                  break;
                } catch (err) {
                  this.$modal.hide("wait_upload"); 
                  this.$modal.show("uploadfail");
                }
              }

              if (!result) {
               this.$modal.hide("wait_upload"); 
               this.$modal.show("uploadfail");
               throw new Error("No qrcode detected");
              }
              this.handleQRPayload(result);
            }
            this.displayProgressBar = false;
          } catch (err) {
            this.$modal.hide("wait_upload");
            console.log(err);
            this.$modal.show("error-not-found");
            this.displayProgressBar = false;
            this.retry();
          }
        };
        reader.readAsDataURL(input.files[0]);
      }
       this.$modal.hide("wait_upload");
    },
  },
};
</script>
<style>
.inputfile {
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: fixed;
  z-index: -1;
}

.btn {
  width: 320px;
  margin: 0 auto;
   display: -webkit-box;
    display: -webkit-flex;
    display: -moz-box;
    display: -ms-flexbox;
    display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.btn-left div {
  width: 220px;
}

.btn-left span {
  font-size: 12px;
  margin-top: 10px;
  display: block;
}

.btn-left label {
  margin-bottom: 0;
  font-size: 14px;
  max-width: 220px !important;
  width: 220px !important;
}

.btn-right div {
  width: 100px;
}

.openHelp p {
  font-size: 12px !important;
  width: 100px;
  margin-top: 0;
}
</style>
