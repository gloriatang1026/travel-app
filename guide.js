const PLACE_GUIDE = {
  christchurch: {
    wiki: "Christchurch",
    hours: "City centre shops are mostly about 9am–5pm. Parks and the river are open through the day.",
    description: "The largest city in the South Island, and the usual start of this drive. The centre is easy on foot: the river, tram, and rebuilt streets. Keep the first day light if you have just landed.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/The_%22Brill%22_Tram_178.New_Regent_St_Christchurch._%2811510530335%29.jpg/330px-The_%22Brill%22_Tram_178.New_Regent_St_Christchurch._%2811510530335%29.jpg",
  },
  "lake tekapo": {
    wiki: "Lake Tekapo",
    hours: "The lake and shore are outdoors and open all day. Shops in the village are mostly daytime.",
    description: "A turquoise lake in the Mackenzie Basin, under a dark-sky reserve. Walk the shore, then stay for the stars if the sky is clear.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/LakeTekapoNov242024_05.jpg/330px-LakeTekapoNov242024_05.jpg",
  },
  "lake tekapo scenic": {
    wiki: "Lake Tekapo",
    hours: "Outdoor viewpoints, open all day. Best in late afternoon when the wind drops.",
    description: "A scenic stop on the lake, for the colour of the water and the mountains behind it. It pairs with the church and the village on the same day.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/LakeTekapoNov242024_05.jpg/330px-LakeTekapoNov242024_05.jpg",
  },
  "the church of the good shepherd": {
    wiki: "Church of the Good Shepherd, Lake Tekapo",
    hours: "The grounds are open in daylight. It is still a working church, so step inside only when visitors are welcome.",
    description: "The small stone church on the shore, built in 1935 as a memorial. The famous view is the church with the lake behind it.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Church_of_the_Good_Shepherd%2C_Tekapo_01.jpg/330px-Church_of_the_Good_Shepherd%2C_Tekapo_01.jpg",
  },
  "astro cafe": {
    wiki: "Mount John University Observatory",
    hours: "The cafe is a daytime stop on Mt John. The summit road is tolled. Stargazing tours run after dark and need a booking.",
    description: "Coffee at the top of Mt John, looking over the whole lake. Drive up and pay the road toll, or walk the Mt John track if you want the longer way.",
    photo: "",
  },
  "state hwy 80": {
    wiki: "Aoraki / Mount Cook",
    hours: "The highway is open unless weather or rockfall closes it. Check the day you drive.",
    description: "The road from Lake Pukaki into Aoraki / Mount Cook Village. The drive is the point: the mountain fills the windscreen when the cloud lifts.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Mt_Cook_LC0247.jpg/330px-Mt_Cook_LC0247.jpg",
  },
  "tasman glacier": {
    wiki: "Tasman Glacier",
    hours: "Go in daylight. The access road can close for weather.",
    description: "New Zealand's largest glacier, seen from the valley viewpoint and lake rather than from the ice itself. Give it a clear morning.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Upper_Tasman_Glacier.jpg/330px-Upper_Tasman_Glacier.jpg",
  },
  "mt cook alpine salmon shop": {
    wiki: "Aoraki / Mount Cook",
    hours: "A daytime shop on the Mount Cook road. Hours move with the season, so check that morning.",
    description: "A salmon shop on the way to Aoraki. Useful as lunch on the glacier day rather than a destination of its own.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Mt_Cook_LC0247.jpg/330px-Mt_Cook_LC0247.jpg",
  },
  "lake pukaki": {
    wiki: "Lake Pukaki",
    hours: "Outdoor lookouts, open all day.",
    description: "The big blue lake with Aoraki at the end of it, on the drive between Tekapo and Wanaka. Stop at the main lookout; the colour is the whole visit.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/LakePukakiNov232024_01.jpg/330px-LakePukakiNov232024_01.jpg",
  },
  "lake wanaka": {
    wiki: "Lake Wānaka",
    hours: "The shore is open all day.",
    description: "The lake the town sits on. Walk the waterfront, especially toward the willow if the wind is down.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/LakeWanakaNov272024.jpg/330px-LakeWanakaNov272024.jpg",
  },
  wanaka: {
    wiki: "Wānaka",
    hours: "Shops and cafes are mostly about 8am–5pm. The lakefront does not close.",
    description: "The town on Lake Wānaka. Use it as a base for Roy's Peak and a slower day before the long drives.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/LakeWanakaNov272024.jpg/330px-LakeWanakaNov272024.jpg",
  },
  "wanaka willow tree": {
    wiki: "Lake Wānaka",
    hours: "Outdoor, all day. It is in the water, so you photograph it from the shore.",
    description: "The lone willow standing in the lake, a short walk from the town centre. Go early if you want it without a crowd.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/LakeWanakaNov272024.jpg/330px-LakeWanakaNov272024.jpg",
  },
  "wanaka sequoia": {
    wiki: "Lake Wānaka",
    hours: "Daylight. It is a short walk from the shore path.",
    description: "A huge sequoia near the lake edge, an easy add-on while you are already walking the waterfront.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/LakeWanakaNov272024.jpg/330px-LakeWanakaNov272024.jpg",
  },
  "playground at the lake": {
    wiki: "Lake Wānaka",
    hours: "Outdoor playground, daylight.",
    description: "The lakeside playground. A short stop if you are travelling with children, between the willow and town.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/LakeWanakaNov272024.jpg/330px-LakeWanakaNov272024.jpg",
  },
  "roys peak": {
    wiki: "Roys Peak",
    hours: "A full-day walk, about 5–6 hours return. Start early. The car park has closed for weather and fire risk, so check before you leave town.",
    description: "The ridge walk above Wānaka, with the lake spread out below. It is steep and exposed. Take water, sun cover, and a backup plan if the gate is shut.",
    photo: "",
  },
  "lighthorse adventures horse treks": {
    wiki: "Wānaka",
    hours: "Treks are booked, usually morning or afternoon. Reserve before the day.",
    description: "A horse trek around Wānaka. This is the slow day after Roy's Peak, not something to stack on the hike.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/LakeWanakaNov272024.jpg/330px-LakeWanakaNov272024.jpg",
  },
  glenorchy: {
    wiki: "Glenorchy, New Zealand",
    hours: "The road and wharf are outdoors. The drive from Queenstown is about 45 minutes each way.",
    description: "The settlement at the head of Lake Wakatipu, used as a stand-in for film landscapes. The wharf and the road there are the visit.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Glenorchy_wharf_and_red_shed_at_Lake_Wakatipu.jpg/330px-Glenorchy_wharf_and_red_shed_at_Lake_Wakatipu.jpg",
  },
  queenstown: {
    wiki: "Queenstown, New Zealand",
    hours: "Town shops about 9am–6pm. Bars and restaurants run later.",
    description: "The resort town on Lake Wakatipu. Use the days here for the gondola, the waterfront, and the cafes already on your list.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  "皇后鎮": {
    wiki: "Queenstown, New Zealand",
    hours: "Town shops about 9am–6pm. The lakefront is open all day.",
    description: "Queenstown, saved under its Chinese name. The waterfront and the gondola hill are the centre of it.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  "skyline queenstown": {
    wiki: "Skyline Queenstown",
    hours: "The gondola commonly runs from about 9am into the evening. Last boarding is earlier than the closing time, and wind can stop it. Check the morning you go.",
    description: "The gondola up Bob's Peak, over the town and the lake. The view is the reason. Luge and dinner at the top are extra.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  fergburger: {
    wiki: "Fergburger",
    hours: "Known for very long hours, often from morning until late at night. The queue is the real wait, so go off-peak.",
    description: "The burger shop on Shotover Street that most Queenstown lists include. One meal, not a sightseeing stop.",
    photo: "",
  },
  "deer park heights queenstown": {
    wiki: "Queenstown, New Zealand",
    hours: "A daylight drive. Gates follow the season, so check before you go up.",
    description: "A hill park above Queenstown where animals stand along the road, and the view back over the lake is wide.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  "arrowtown bakery": {
    wiki: "Arrowtown",
    hours: "A morning bakery. Go before noon if you want the famous pies.",
    description: "The bakery on Buckingham Street in the old gold-mining town, about 20 minutes from Queenstown. Walk the street after you eat.",
    photo: "",
  },
  "black lab coffee roasters queenstown": {
    wiki: "Queenstown, New Zealand",
    hours: "Cafe hours, roughly morning until mid-afternoon. Confirm the day you go.",
    description: "A Queenstown coffee stop. Fit it into a town morning rather than giving it its own drive.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  "wolf coffee roasters": {
    wiki: "Queenstown, New Zealand",
    hours: "Cafe hours, roughly morning until mid-afternoon.",
    description: "Another Queenstown roaster. Pair it with a waterfront walk, not with a hike day.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  "coffee jo good": {
    wiki: "Queenstown, New Zealand",
    hours: "Cafe hours, roughly morning until mid-afternoon.",
    description: "A coffee stop around Queenstown. Keep it on an easy town day.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  "charlie brown crepes": {
    wiki: "Queenstown, New Zealand",
    hours: "Daytime crepes. Hours vary, so check before you cross town for them.",
    description: "Crepes in Queenstown. A short food stop, best on a day you are already in town.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  "curbside coffee and bagels": {
    wiki: "Queenstown, New Zealand",
    hours: "Morning through early afternoon.",
    description: "Coffee and bagels. Use it as breakfast on a Queenstown morning.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  "the boat shed cafe": {
    wiki: "Queenstown, New Zealand",
    hours: "Daytime cafe on the water. Hours vary with the season.",
    description: "A cafe by the lake. Go for the setting as much as the menu, and sit outside if the wind allows.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  "saigon kingdom vietnamese restaurant remarkables park": {
    wiki: "Queenstown, New Zealand",
    hours: "A restaurant, usually lunch and dinner. Book if you are going at night.",
    description: "Vietnamese food at Remarkables Park, a short drive from the town centre. Better as dinner than as a midday detour from a hike.",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/330px-Queenstown_1_%288168013172%29.jpg",
  },
  "lake muller lookout": {
    wiki: "Milford Sound",
    hours: "A roadside lookout on the Milford road. Daylight, and only if the road is open.",
    description: "A lookout on the drive to Milford Sound. Stop on the way in, not as its own day.",
    photo: "",
  },
  "milford sound piopiotahi": {
    wiki: "Milford Sound",
    hours: "Cruises run through the day, often from about 9am. The drive from Queenstown is about 4–5 hours each way, so leave early or join a tour.",
    description: "Piopiotahi / Milford Sound, the fiord under Mitre Peak. The cruise is about two hours. The road there, through the Homer Tunnel, is half the experience.",
    photo: "",
  },
};

function normName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .trim();
}

function guideFor(name) {
  const key = normName(name);
  if (PLACE_GUIDE[key]) return PLACE_GUIDE[key];
  const found = Object.keys(PLACE_GUIDE).find((item) => key.includes(item) || item.includes(key));
  return found ? PLACE_GUIDE[found] : null;
}

function guessMinutes(name) {
  const text = normName(name);
  if (/roys peak/.test(text)) return 360;
  if (/milford sound/.test(text)) return 180;
  if (/horse|trek/.test(text)) return 120;
  if (/glacier|skyline|glenorchy|christchurch|queenstown|wanaka|皇后/.test(text)) return 90;
  if (/lookout|church|playground|sequoia|willow|hwy|highway/.test(text)) return 30;
  if (/coffee|cafe|bakery|bagel|crepe/.test(text)) return 45;
  if (/burger|restaurant|salmon/.test(text)) return 75;
  if (/lake|scenic/.test(text)) return 60;
  return 60;
}

function applyGuide(place) {
  const guide = guideFor(place.name);
  if (guide) {
    if (!place.description) place.description = guide.description;
    if (!place.hours) place.hours = guide.hours;
    if (!place.photo && guide.photo) place.photo = guide.photo;
    if (!place.wiki && guide.wiki) place.wiki = guide.wiki;
  }
  if (place.duration == null || place.duration === "") place.duration = guessMinutes(place.name);
  return place;
}
