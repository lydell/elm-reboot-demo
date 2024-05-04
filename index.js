{
  let app = Elm.Main.init({ flags: { userModel: null } });

  const aside = document.createElement("aside");

  const h2 = document.createElement("h2");
  h2.textContent = "Control panel";

  const p = document.createElement("p");
  p.textContent = "This section is not rendered with Elm.";

  let dieData = null;

  const dieIncompleteButton = document.createElement("button");
  dieIncompleteButton.onclick = () => {
    onKill();
    dieData = app.dieIncomplete();
  };
  dieIncompleteButton.textContent = "❌ Kill app incompletely";

  const dieButton = document.createElement("button");
  dieButton.onclick = () => {
    onKill();
    dieData = app.die();
  };
  dieButton.textContent = "✅ Kill app completely";

  const remountButton = document.createElement("button");
  remountButton.onclick = () => {
    onRemount();
    console.log("Remounting with:", dieData);
    app = Elm.Main.init({
      flags: { userModel: dieData.model.userModel },
      // Passing in the last VNode from the previous app is required to make the scroll position persist.
      lastVNode: dieData.lastVNode,
    });
    dieData = null;
  };
  remountButton.textContent = "🔄 Remount app";

  const buttonRow = document.createElement("p");
  buttonRow.append(dieIncompleteButton, " ", dieButton);

  onRemount();
  aside.append(h2, p, buttonRow, remountButton);
  document.documentElement.append(aside);

  function onKill() {
    dieIncompleteButton.disabled = true;
    dieButton.disabled = true;
    remountButton.disabled = false;
    document.addEventListener("click", onLinkClick);
  }

  function onRemount() {
    dieIncompleteButton.disabled = false;
    dieButton.disabled = false;
    remountButton.disabled = true;
    document.removeEventListener("click", onLinkClick);
  }

  function onLinkClick(event) {
    if (event.target instanceof HTMLAnchorElement) {
      event.preventDefault();
      alert(
        `This would have been a good old full browser navigation, but this demo intercepts that to make testing easier. Url: ${event.target.href}`
      );
    }
  }
}
