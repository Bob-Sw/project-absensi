const API_URL = "ISI_URL_GAS_WEBAPP";

let video = document.getElementById("video");
let stream = null;

// START CAMERA
async function startCam() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (err) {
    alert("Camera error: " + err.message);
  }
}

// GET GPS
function getLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (pos.coords.accuracy > 50) {
          reject("GPS tidak akurat");
        } else {
          resolve(pos.coords);
        }
      },
      err => reject(err.message)
    );
  });
}

// HITUNG JARAK
function getDistance(lat1, lon1, lat2, lon2) {
  let R = 6371e3;
  let dLat = (lat2 - lat1) * Math.PI/180;
  let dLon = (lon2 - lon1) * Math.PI/180;

  let a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);

  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// CAPTURE FOTO
function capture() {
  let canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  canvas.getContext("2d").drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.5);
}

// OFFLINE STORAGE
function saveOffline(data) {
  let req = indexedDB.open("absensiDB", 1);

  req.onupgradeneeded = e => {
    e.target.result.createObjectStore("queue", { autoIncrement: true });
  };

  req.onsuccess = e => {
    let db = e.target.result;
    let tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").add(data);
  };
}

// SYNC
function syncData() {
  let req = indexedDB.open("absensiDB", 1);

  req.onsuccess = e => {
    let db = e.target.result;
    let tx = db.transaction("queue", "readwrite");
    let store = tx.objectStore("queue");

    let getAll = store.getAll();

    getAll.onsuccess = () => {
      getAll.result.forEach(item => {
        fetch(API_URL, {
          method: "POST",
          body: JSON.stringify(item)
        });
      });

      store.clear();
    };
  };
}

window.addEventListener("online", syncData);

// ABSEN
async function ambilFoto() {
  try {
    let loc = await getLocation();
    let foto = capture();

    let data = {
      lat: loc.latitude,
      lng: loc.longitude,
      foto: foto,
      waktu: new Date().toISOString()
    };

    if (navigator.onLine) {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(data)
      });
      document.getElementById("status").innerText = "Berhasil absen";
    } else {
      saveOffline(data);
      document.getElementById("status").innerText = "Offline, disimpan";
    }

  } catch (err) {
    alert(err);
  }
}

startCam();