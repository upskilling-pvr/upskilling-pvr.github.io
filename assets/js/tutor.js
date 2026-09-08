/* Tutor profile page: render the tutor, list availability, run the booking form. */
(function () {
  "use strict";

  var data = window.ABCData;
  var track = (window.ABC && window.ABC.track) || function () {};

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
  function initials(name) {
    return name.split(" ").map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
  }
  function el(id) { return document.getElementById(id); }

  var tutor = data.getTutor(getParam("id"));

  /* ---------- Unknown tutor ---------- */
  if (!tutor) {
    document.title = "Tutor not found — ABC Tutoring";
    el("profile").innerHTML =
      '<p style="padding:48px 0">We couldn\'t find that tutor. ' +
      '<a href="index.html">Back to all tutors →</a></p>';
    return;
  }

  document.title = tutor.name + " — ABC Tutoring";

  /* ---------- Fire the profile-view event ---------- */
  track("tutor_profile_viewed", {
    tutor_id: tutor.id,
    tutor_name: tutor.name,
    subject: tutor.subject,
  });

  /* ---------- Render the hero ---------- */
  el("avatar").textContent = initials(tutor.name);
  el("avatar").style.background = tutor.color;
  el("tutor-name").textContent = tutor.name;
  el("tutor-sub").textContent =
    tutor.topics + " · " + tutor.gradeLevels + " · $" + tutor.rate + "/hr";
  el("tutor-pill").textContent = tutor.subject;
  el("tutor-bio").textContent = tutor.bio;
  el("subject-input").value = tutor.subject;

  /* ---------- Availability ---------- */
  var selectedSlot = null;
  var bookingStarted = false;

  function markBookingStarted() {
    if (bookingStarted) return;
    bookingStarted = true;
    track("booking_started", { tutor_id: tutor.id, subject: tutor.subject });
  }

  function renderSlots() {
    var slots = data.availableSlots(tutor);
    var host = el("availability");
    host.innerHTML = "";

    if (!slots.length) {
      host.innerHTML = '<p class="no-slots">No open times in the next few days — please check back soon.</p>';
      return;
    }

    var byDay = {};
    var order = [];
    slots.forEach(function (s) {
      if (!byDay[s.dayLabel]) { byDay[s.dayLabel] = []; order.push(s.dayLabel); }
      byDay[s.dayLabel].push(s);
    });

    order.forEach(function (day) {
      var group = document.createElement("div");
      group.className = "day-group";
      var label = document.createElement("div");
      label.className = "day-label";
      label.textContent = day;
      group.appendChild(label);

      var row = document.createElement("div");
      row.className = "slots";
      byDay[day].forEach(function (s) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "slot";
        b.textContent = s.time;
        b.addEventListener("click", function () {
          markBookingStarted();
          selectedSlot = s;
          Array.prototype.forEach.call(host.querySelectorAll(".slot"), function (x) {
            x.classList.remove("selected");
          });
          b.classList.add("selected");
          updateSlotNote();
        });
        row.appendChild(b);
      });
      group.appendChild(row);
      host.appendChild(group);
    });
  }

  function updateSlotNote() {
    var note = el("selected-slot-note");
    if (selectedSlot) {
      note.innerHTML = "Selected time: <b>" + selectedSlot.when + "</b>";
    } else {
      note.textContent = "Pick a time above to book.";
    }
  }

  renderSlots();
  updateSlotNote();

  /* ---------- Booking form ---------- */
  var form = el("booking-form");
  var errorText = el("form-error");

  Array.prototype.forEach.call(form.querySelectorAll("input, select"), function (field) {
    field.addEventListener("focus", markBookingStarted, { once: true });
  });

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorText.textContent = "";

    var parentName = el("parent-name").value.trim();
    var parentEmail = el("parent-email").value.trim();
    var studentName = el("student-name").value.trim();
    var studentGrade = el("student-grade").value;
    var subject = el("subject-input").value.trim();

    if (!parentName || !parentEmail || !studentName || !studentGrade || !subject) {
      errorText.textContent = "Please fill in every field.";
      return;
    }
    if (!isEmail(parentEmail)) {
      errorText.textContent = "Please enter a valid email address.";
      return;
    }
    if (!selectedSlot) {
      errorText.textContent = "Please pick a time slot above.";
      return;
    }

    // Lock the slot for the rest of the session.
    data.lockSlot(selectedSlot.id);

    track("booking_completed", {
      tutor_id: tutor.id,
      subject: tutor.subject, // canonical subject, matches booking_started
      slot_time: selectedSlot.when,
    });

    // Confirmation state.
    el("confirm-tutor").textContent = tutor.name;
    el("confirm-when").textContent = selectedSlot.when;
    el("confirm-subject").textContent = subject;
    el("confirm-student").textContent = studentName + " (grade " + studentGrade + ")";
    el("confirm-email").textContent = parentEmail;

    el("booking-panel").classList.add("hidden");
    el("confirmation").classList.remove("hidden");
    el("confirmation").scrollIntoView({ behavior: "smooth", block: "center" });

    renderSlots();
    selectedSlot = null;
  });
})();
