window.KH_FLEET = {
  "maybach-sprinter": { name: "Maybach Sprinter limousine", rate: 195, passengers: 14, image: "assets/sprinter-exterior-enhanced.webp", page: "maybach-sprinter.html", minimumForDay: day => [5,6].includes(day) ? 5 : 4 },
  "executive-sprinter": { name: "Executive Mercedes Sprinter", rate: 195, passengers: 14, image: "assets/sprinter-interior-enhanced.webp", page: "executive-sprinter.html", minimumForDay: day => [5,6].includes(day) ? 5 : 4 },
  "limo-bus": { name: "Limousine bus", rate: 250, passengers: 28, image: "assets/limo-bus-exterior.webp", page: "limo-bus.html", minimumForDay: () => 5 },
  "escalade-esv": { name: "Cadillac Escalade ESV", rate: 150, passengers: null, image: "assets/escalade-enhanced.webp", page: "escalade.html", minimumForDay: () => 4 },
  "g-wagon": { name: "Mercedes-Benz G-Wagon", rate: 200, passengers: null, image: "assets/g-wagon-enhanced.webp", page: "g-wagon.html", minimumForDay: () => 4 }
};

window.KH_BOOKING = {
  email: "bookingkhgrup@gmail.com",
  phone: "+14046687532",
  phoneDisplay: "(404) 668-7532",
  timezone: "America/New_York",
  // Free Geoapify key for address suggestions on the request form (restrict it to
  // bookingkhgrup.com in the Geoapify dashboard). Empty = plain address fields.
  geoapifyKey: "522e714c9e1d45a3b53101d88b25a681",
  depositPercent: 50,
  metroPolicy: "Tolls and parking are included for Metro Atlanta trips.",
  outOfTownPolicy: "Tolls and parking are additional for out-of-town trips."
};
