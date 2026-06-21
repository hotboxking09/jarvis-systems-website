const button = document.querySelector("#status-button");
const status = document.querySelector("#status");

button.addEventListener("click", () => {
  const time = new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  status.textContent = `Alle Systeme bereit – geprüft um ${time}.`;
});
