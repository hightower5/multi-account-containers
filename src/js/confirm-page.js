async function load() {
  const searchParams = new URL(window.location).searchParams;
  const redirectUrl = decodeURIComponent(searchParams.get("url"));
  const cookieStoreId = searchParams.get("cookieStoreId");
  const currentCookieStoreId = searchParams.get("currentCookieStoreId");
  const redirectUrlElement = document.getElementById("redirect-url");
  redirectUrlElement.textContent = redirectUrl;
  appendFavicon(redirectUrl, redirectUrlElement);

  const container = await browser.contextualIdentities.get(cookieStoreId);
  [...document.querySelectorAll(".container-name")].forEach((containerNameElement) => {
    containerNameElement.textContent = container.name;
  });

  // If default container, button will default to normal HTML content
  if (currentCookieStoreId) {
    const currentContainer = await browser.contextualIdentities.get(currentCookieStoreId);
    document.getElementById("current-container-name").textContent = currentContainer.name;
  }

  document.getElementById("redirect-form").addEventListener("submit", (e) => {
    e.preventDefault();
    let button = "confirm"; // Confirm is the form default.
    let buttonTarget = e.explicitOriginalTarget;
    if (buttonTarget.tagName !== "BUTTON") {
      buttonTarget = buttonTarget.closest("button");
    }
    if (buttonTarget && buttonTarget.id) {
      button = buttonTarget.id;
    }
    switch (button) {
    case "deny":
      denySubmit(redirectUrl);
      break;
    case "confirm":
      confirmSubmit(redirectUrl, cookieStoreId);
      break;
    }
  });
}

function appendFavicon(pageUrl, redirectUrlElement) {
  const origin = new URL(pageUrl).origin;
  const favIconElement = Utils.createFavIconElement(`${origin}/favicon.ico`);

  redirectUrlElement.prepend(favIconElement);
}

function confirmSubmit(redirectUrl, cookieStoreId) {
  const neverAsk = document.getElementById("never-ask").checked;
  // Sending neverAsk message to background to store for next time we see this process
  if (neverAsk) {
    browser.runtime.sendMessage({
      method: "neverAsk",
      neverAsk: true,
      pageUrl: redirectUrl
    });
  }
  openInContainer(redirectUrl, cookieStoreId);
}

function getCurrentTab() {
  return browser.tabs.query({
    active: true,
    windowId: browser.windows.WINDOW_ID_CURRENT
  });
}

async function denySubmit(redirectUrl) {
  const tab = await getCurrentTab();
  await browser.runtime.sendMessage({
    method: "exemptContainerAssignment",
    tabId: tab[0].id,
    pageUrl: redirectUrl
  });
  document.location.replace(redirectUrl);
}

load();

async function openInContainer(redirectUrl, cookieStoreId) {
  const tab = await getCurrentTab();
  await browser.tabs.create({
    index: tab[0].index + 1,
    cookieStoreId,
    url: redirectUrl
  });
  if (tab.length > 0) {
    browser.tabs.remove(tab[0].id);
  }
}
