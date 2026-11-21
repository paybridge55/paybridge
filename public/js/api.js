(function () {
  var API_BASE = "/api/v1";

  function request(method, path, body) {
    var options = {
      method: method,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };
    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    return fetch(API_BASE + path, options)
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              var err = data && data.error ? data.error : {};
              var e = new Error(err.message || "कुछ गड़बड़ी हुई। फिर कोशिश करें।");
              e.code = err.code || "UNKNOWN";
              e.status = res.status;
              throw e;
            }
            return data;
          });
      })
      .catch(function (e) {
        if (e && e.code) throw e;
        var net = new Error("इंटरनेट या सर्वर की समस्या है। फिर कोशिश करें।");
        net.code = "NETWORK";
        throw net;
      });
  }

  function showAlert(el, type, message) {
    if (!el) return;
    el.className = "alert " + type + " show";
    el.textContent = message;
  }

  function hideAlert(el) {
    if (!el) return;
    el.className = "alert";
    el.textContent = "";
  }

  function setLoading(button, loading, loadingText) {
    if (!button) return;
    if (loading) {
      button.dataset.label = button.textContent;
      button.textContent = loadingText || "कृपया रुकें...";
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = false;
    }
  }

  window.PB = {
    signup: function (data) {
      return request("POST", "/auth/signup", data);
    },
    login: function (data) {
      return request("POST", "/auth/login", data);
    },
    logout: function () {
      return request("POST", "/auth/logout", {});
    },
    me: function () {
      return request("GET", "/auth/me");
    },
    showAlert: showAlert,
    hideAlert: hideAlert,
    setLoading: setLoading,
  };
})();
