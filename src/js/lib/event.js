export default function sendEvent(type, data) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(type, false, false, data);
    window.dispatchEvent(evt);
}
