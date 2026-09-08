/* Homepage: render the tutor grid + run the subject search. */
(function () {
  "use strict";

  var data = window.ABCData;
  var track = (window.ABC && window.ABC.track) || function () {};

  var grid = document.getElementById("tutor-grid");
  var form = document.getElementById("search-form");
  var input = document.getElementById("search-input");
  var status = document.getElementById("search-status");
  var notOffered = document.getElementById("not-offered");
  var resetBtn = document.getElementById("search-reset");

  function initials(name) {
    return name
      .split(" ")
      .map(function (p) { return p[0]; })
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function tutorCard(t) {
    var a = document.createElement("a");
    a.className = "card";
    a.href = "tutor.html?id=" + encodeURIComponent(t.id);
    a.dataset.subject = t.subject;
    a.innerHTML =
      '<div class="card-top">' +
        '<div class="avatar" style="background:' + t.color + '">' + initials(t.name) + "</div>" +
        "<div>" +
          "<h3>" + t.name + "</h3>" +
          '<span class="pill">' + t.subject + "</span>" +
        "</div>" +
      "</div>" +
      "<p class=\"muted\">" + t.topics + " · " + t.gradeLevels + "</p>" +
      '<div class="meta"><span>View profile →</span><span class="rate">$' + t.rate + "/hr</span></div>";
    return a;
  }

  function render() {
    grid.innerHTML = "";
    data.tutors.forEach(function (t) {
      grid.appendChild(tutorCard(t));
    });
  }

  function clearFilter() {
    status.textContent = "";
    status.classList.add("hidden");
    notOffered.classList.add("hidden");
    resetBtn.classList.add("hidden");
    Array.prototype.forEach.call(grid.children, function (c) {
      c.classList.remove("dim");
    });
  }

  function applySearch(rawQuery) {
    var query = rawQuery.trim();
    if (!query) {
      clearFilter();
      return;
    }
    var subject = data.matchSubject(query);
    var matched = !!subject;

    track("subject_searched", { query: query.toLowerCase(), matched: matched });

    resetBtn.classList.remove("hidden");

    if (matched) {
      notOffered.classList.add("hidden");
      var count = 0;
      Array.prototype.forEach.call(grid.children, function (c) {
        var hit = c.dataset.subject === subject;
        c.classList.toggle("dim", !hit);
        if (hit) count++;
      });
      status.classList.remove("hidden");
      status.textContent =
        'Showing ' + count + " " + subject + " tutor" + (count === 1 ? "" : "s") +
        ' for “' + query + "”.";
    } else {
      Array.prototype.forEach.call(grid.children, function (c) {
        c.classList.remove("dim");
      });
      status.classList.add("hidden");
      notOffered.classList.remove("hidden");
      document.getElementById("not-offered-query").textContent = query;
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    applySearch(input.value);
  });
  resetBtn.addEventListener("click", function () {
    input.value = "";
    clearFilter();
    input.focus();
  });

  render();
})();
