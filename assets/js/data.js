/* Client-side data model. In-memory for the session; slot locks are kept in
 * sessionStorage so a booking stays "taken" as you move between the homepage
 * and a profile page within the same tab. Clears when the tab closes. */

(function () {
  "use strict";

  /* ---------- The 6 tutors ---------- */
  var TUTORS = [
    {
      id: "t1",
      name: "Priya Sharma",
      subject: "math",
      topics: "Elementary math",
      gradeLevels: "Grades 2–5",
      rate: 45,
      bio: "Priya makes early math feel like a game. She focuses on number sense, times tables, fractions, and word problems, and loves helping younger students build confidence before things get harder.",
      color: "#1fa98f",
      slotSeed: 3,
    },
    {
      id: "t2",
      name: "Marcus Bell",
      subject: "math",
      topics: "Pre-algebra & Algebra I",
      gradeLevels: "Grades 6–9",
      rate: 55,
      bio: "Marcus is a former middle-school teacher who specialises in the jump from arithmetic to algebra. Expect lots of real-world examples and a patient, step-by-step approach to equations.",
      color: "#3b7dd8",
      slotSeed: 5,
    },
    {
      id: "t3",
      name: "Elena Ruiz",
      subject: "math",
      topics: "Geometry & Algebra II",
      gradeLevels: "Grades 9–12",
      rate: 65,
      bio: "Elena covers high-school math through Algebra II, including geometry proofs and functions. She's helped dozens of students raise a letter grade and walk into tests calm.",
      color: "#c0567a",
      slotSeed: 2,
    },
    {
      id: "t4",
      name: "Daniel Okafor",
      subject: "math",
      topics: "Upper-elementary & middle math",
      gradeLevels: "Grades 4–8",
      rate: 50,
      bio: "Daniel works on fractions, ratios, decimals, and the foundations of pre-algebra. He keeps sessions light and hands-on, with plenty of practice problems tailored to each student.",
      color: "#e08a3c",
      slotSeed: 6,
    },
    {
      id: "t5",
      name: "Aisha Khan",
      subject: "science",
      topics: "Life & physical science",
      gradeLevels: "Grades 5–10",
      rate: 60,
      bio: "Aisha teaches middle- and early-high-school science — biology, physics basics, earth science, and lab reports. She connects each topic to something students can actually see in the world.",
      color: "#6a8f2f",
      slotSeed: 4,
    },
    {
      id: "t6",
      name: "Grace Lin",
      subject: "reading",
      topics: "Phonics, fluency & comprehension",
      gradeLevels: "Grades K–4",
      rate: 45,
      bio: "Grace is a reading specialist for early readers. She builds phonics skills, reading fluency, and comprehension through stories kids enjoy, and gives parents simple things to practise at home.",
      color: "#8a63c4",
      slotSeed: 7,
    },
  ];

  /* ---------- Subjects we offer + search synonyms ---------- */
  /* A search term counts as "offered" if it hits one of these. Anything else
   * (e.g. "chemistry", "calculus", "essay writing") is logged as unmet demand. */
  var OFFERED = {
    math: [
      "math", "maths", "mathematics", "arithmetic", "fractions", "decimals",
      "ratios", "pre-algebra", "prealgebra", "pre algebra", "algebra",
      "algebra i", "algebra 1", "algebra ii", "algebra 2", "geometry",
      "times tables", "multiplication", "division",
    ],
    science: [
      "science", "biology", "life science", "physical science", "earth science",
      "physics", "ecology", "anatomy", "lab report",
    ],
    reading: [
      "reading", "phonics", "fluency", "comprehension", "literacy",
      "vocabulary", "spelling", "decoding", "early reading",
    ],
  };

  function matchSubject(query) {
    var q = (query || "").trim().toLowerCase();
    if (!q) return null;
    var subjects = Object.keys(OFFERED);
    for (var i = 0; i < subjects.length; i++) {
      var subj = subjects[i];
      if (subj === q) return subj;
      var words = OFFERED[subj];
      for (var j = 0; j < words.length; j++) {
        var w = words[j];
        if (q === w || q.indexOf(w) !== -1 || w.indexOf(q) !== -1) return subj;
      }
    }
    return null;
  }

  /* ---------- Availability: rolling 6-day window from today ---------- */
  var TIME_POOL = [
    { label: "3:00pm", h: 15 },
    { label: "4:00pm", h: 16 },
    { label: "5:00pm", h: 17 },
    { label: "6:00pm", h: 18 },
  ];

  function dayLabel(date) {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  /* Deterministic per tutor+day+time so re-renders are stable within a session. */
  function slotShown(seed, dayOffset, timeIndex) {
    var n = (seed * 13 + dayOffset * 7 + timeIndex * 5) % 6;
    return n !== 0 && n !== 4; // ~2–3 slots most days, occasional empty day
  }

  function buildSlots(tutor) {
    var slots = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    for (var d = 1; d <= 6; d++) {
      var date = new Date(today);
      date.setDate(today.getDate() + d);
      var label = dayLabel(date);
      for (var t = 0; t < TIME_POOL.length; t++) {
        if (!slotShown(tutor.slotSeed, d, t)) continue;
        slots.push({
          id: tutor.id + "-d" + d + "-" + TIME_POOL[t].h,
          dayLabel: label,
          time: TIME_POOL[t].label,
          when: label + " at " + TIME_POOL[t].label,
        });
      }
    }
    return slots;
  }

  /* ---------- Booked-slot state (sessionStorage) ---------- */
  var STORE_KEY = "abc_booked_slots";

  function bookedSet() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  }
  function lockSlot(slotId) {
    try {
      var set = bookedSet();
      set.add(slotId);
      sessionStorage.setItem(STORE_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {
      /* private mode / disabled storage — booking still works for this view */
    }
  }
  function isBooked(slotId) {
    return bookedSet().has(slotId);
  }

  function getTutor(id) {
    for (var i = 0; i < TUTORS.length; i++) {
      if (TUTORS[i].id === id) return TUTORS[i];
    }
    return null;
  }

  function availableSlots(tutor) {
    return buildSlots(tutor).filter(function (s) {
      return !isBooked(s.id);
    });
  }

  window.ABCData = {
    tutors: TUTORS,
    getTutor: getTutor,
    matchSubject: matchSubject,
    availableSlots: availableSlots,
    lockSlot: lockSlot,
  };
})();
