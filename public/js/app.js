// PayBridge - landing page script (mobile menu)
(function () {
  var btn = document.getElementById("menuBtn");
  var links = document.getElementById("navLinks");
  var icon = document.getElementById("menuIcon");
  if (!btn || !links || !icon) return;

  function setOpen(open) {
    links.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    icon.firstElementChild.setAttribute("href", open ? "#i-x" : "#i-menu");
  }

  btn.addEventListener("click", function () {
    setOpen(!links.classList.contains("open"));
  });
  links.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });
})();
