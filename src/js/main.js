import iframeMessenger from 'guardian/iframe-messenger'
import reqwest from 'reqwest'
import mainHTML from './text/main.html!text'

var el = document.querySelector('#interactive');

iframeMessenger.enableAutoResize();

reqwest({
    url: 'http://ip.jsontest.com/',
    type: 'json',
    crossOrigin: true,
    success: (resp) => el.innerHTML = `Your IP address is ${resp.ip}`
});
