import iframeMessenger from 'guardian/iframe-messenger'
import reqwest from 'reqwest'
import doT from 'olado/doT'
import madlib from './lib/madlib'
import sendEvent from './lib/event'
import geocode from './lib/geocode'

import mainHTML from './text/main.html!text'
import statsHTML from './text/stats.html!text'
import statsRaw from './data/stats.tsv!text'

var statsTemplateFn = doT.template(statsHTML);

var stats = statsRaw.split('\n').map(function (stat) {
    var [force, id, ...numbers] = stat.split('\t');
    var [population, current, applications, appointments] = numbers.map(n => parseFloat(n));
    return {
        force,
        id,
        population,
        current,
        applications,
        appointments
    };
}).filter(s => s.force);

var maxPopulation = Math.max.apply(null, stats.map(s => s.population));

var overall = stats.reduce(function (a, b) {
    return {
        'force': 'Overall',
        'id': 'overall',
        'population': a.population + b.population,
        'current': a.current + b.current,
        'applications': a.applications + b.applications,
        'appointments': a.appointments + (b.appointments || 0)
    };
});

overall.population /= stats.length;
overall.current /= stats.length;

stats.push(overall);

var forces = stats.map(s => s.force);

var el = document.querySelector('#interactive');
el.innerHTML = mainHTML;

var statsEl = el.querySelector('.js-stats');
var userLocationEl = el.querySelector('.js-gps');

function locateForce(lat, lng) {
    reqwest({
        'url': `https://data.police.uk/api/locate-neighbourhood?q=${lat},${lng}`,
        'type': 'json',
        'crossOrigin': true,
        'success': resp => changeForce(resp.force)
    });
}

function changeForce(forceId) {
    var forceStats = stats.find(s => s.id === forceId);
    statsEl.innerHTML = statsTemplateFn({'stats': forceStats, 'max': maxPopulation});
}

madlib(el.querySelector('.js-postcode'), loc => {
    geocode(loc, (err, resp) => {
        if (!err) {
            locateForce(resp.features[0].center[1], resp.features[0].center[0]);
        }
    });
});

if ('geolocation' in navigator) {
    userLocationEl.style.display = 'block';
    userLocationEl.addEventListener('click', () => {
        userLocationEl.removeAttribute('data-has-error');
        userLocationEl.setAttribute('data-is-loading', '');

        navigator.geolocation.getCurrentPosition(function (position) {
            locateForce(position.coords.latitude, position.coords.longitude);
            userLocationEl.removeAttribute('data-is-loading');
        }, function (err) {
            console.log(err);
            userLocationEl.removeAttribute('data-is-loading');
            userLocationEl.addAttribute('data-has-error', '');
        });

        userLocationEl.blur();
    });
}

iframeMessenger.enableAutoResize();
changeForce('overall');
