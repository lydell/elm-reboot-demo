{
	// Move the control panel outside of <body> to avoid Elm touching it.
	document.documentElement.append(aside);

	let app = Elm.Main.init({ flags: { userModel: null } });

	let dieData = null;

	dieIncompleteButton.onclick = () => {
		onKill();
		dieData = app.dieIncomplete();
	};

	dieButton.onclick = () => {
		onKill();
		dieData = app.die();
	};

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

	onRemount();

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
