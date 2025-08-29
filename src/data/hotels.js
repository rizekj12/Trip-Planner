// src/data/hotels.js
export const HOTELS = {
  tokyo_akiba: {
    type: "hotel",
    title: "NOHGA HOTEL AKIHABARA",
    name: "NOHGA HOTEL AKIHABARA",
    coords: [35.7017, 139.7698],
    address: "3-10-11 Sotokanda, Tokyo 110-0021",
    // Put your image at: public/hotels/nohga-akihabara.jpg
    img: "/hotels/nohga-akihabara.jpg",
    checkIn: "15:00",
    checkOut: "11:00",
    phone: "+81 3-6206-0560",
    website: "https://nohgahotel.com/akihabara/en/",
    links: { maps: "https://maps.app.goo.gl/BSm2UM2hBoq3aKck9" },
  },

  kyoto_rokujo: {
    type: "hotel",
    name: "Oriental Hotel Kyoto Rokujo",
    title: "ORIENTAL HOTEL KYOTO ROKUJO",
    coords: [34.9945, 135.7553],
    address: "181 Bokumikanabutsu-cho, Kyoto 600-8333",
    // Put your image at: public/hotels/oriental-kyoto-rokujo.jpg
    img: "/hotels/oriental-kyoto-rokujo.jpg",
    checkIn: "15:00",
    checkOut: "11:00",
    phone: "+81 75-371-6345",
    website: "https://www.hotelkyoto.oriental-hotels.com/",
    links: { maps: "https://maps.app.goo.gl/QkXxFe2zS3x7jGpRA" },
  },

  tokyo_tamachi: {
    type: "hotel",
    name: "Shizutetsu Prezio Tokyo Tamachi",
    title: "Shizutetsu Hotel Prezio Tokyo Tamachi",
    coords: [35.6447, 139.7477],
    address: "3-6-18 Shibaura, Minato-ku, Tokyo 108-0023",
    // Put your image at: public/hotels/prezio-tamachi.jpg
    img: "/hotels/prezio-tamachi.jpg",
    checkIn: "15:00",
    checkOut: "11:00",
    phone: "+81 3-6722-1132",
    website: "https://www.shizutetsu-hotel.jp/prezio-tamachi/en/",
    links: { maps: "https://maps.app.goo.gl/8G5dA1T2Qy6b6e1E7" },
  },
};
