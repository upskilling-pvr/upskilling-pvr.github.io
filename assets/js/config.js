/* PostHog setup + a tiny event helper.
 *
 * Static site, no build step — PostHog's "Web" snippet loaded via <script>.
 * Autocapture (free pageviews) stays on; the custom events below are what
 * Dana actually asked about.
 *
 * Region: US cloud. For EU, change POSTHOG_HOST to "https://eu.i.posthog.com".
 */
var POSTHOG_KEY = "phc_AX5EDaEeLYm3yceaPGe3aHf2X6Dm6AYt8RjxKuTFHtgz";
var POSTHOG_HOST = "https://us.i.posthog.com";

!(function (t, e) {
  var o, n, p, r;
  e.__SV ||
    ((window.posthog = e),
    (e._i = []),
    (e.init = function (i, s, a) {
      function g(t, e) {
        var o = e.split(".");
        2 == o.length && ((t = t[o[0]]), (e = o[1])),
          (t[e] = function () {
            t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
          });
      }
      ((p = t.createElement("script")).type = "text/javascript"),
        (p.crossOrigin = "anonymous"),
        (p.async = !0),
        (p.src =
          s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") +
          "/static/array.js"),
        (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
      var u = e;
      for (
        void 0 !== a ? (u = e[a] = []) : (a = "posthog"),
          u.people = u.people || [],
          u.toString = function (t) {
            var e = "posthog";
            return (
              "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e
            );
          },
          u.people.toString = function () {
            return u.toString(1) + ".people (stub)";
          },
          o =
            "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording capture_pageview capture_pageleave debug getPageViewId".split(
              " "
            ),
          n = 0;
        n < o.length;
        n++
      )
        g(u, o[n]);
      e._i.push([i, s, a]);
    }),
    (e.__SV = 1));
})(document, window.posthog || []);

posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST });

/* window.ABC.track(event, props) — safe no-op if PostHog failed to load. */
window.ABC = window.ABC || {};
window.ABC.track = function (event, props) {
  try {
    if (window.posthog && typeof window.posthog.capture === "function") {
      window.posthog.capture(event, props || {});
    }
  } catch (e) {
    /* analytics must never break the page */
  }
};
