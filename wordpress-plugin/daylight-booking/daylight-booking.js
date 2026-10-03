document.addEventListener("click", (event) => {
  const openButton = event.target.closest(".daylight-booking-open");
  if (openButton) {
    const dialog = document.getElementById(openButton.getAttribute("aria-controls"));
    if (dialog && !dialog.open) dialog.showModal();
    return;
  }

  const closeButton = event.target.closest(".daylight-booking-close");
  if (closeButton) closeButton.closest("dialog")?.close();
});
