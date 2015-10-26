import iframeMessenger from 'guardian/iframe-messenger'
import reqwest from 'reqwest'
import doT from 'olado/doT'
import madlib from './lib/madlib'
import sendEvent from './lib/event'
import geocode from './lib/geocode'

import regionHTML from './text/region.html!text'
import statsHTML from './text/stats.html!text'

import regions from './data/regions.json!json'
import statsRaw from './data/stats.tsv!text'

var regionTemplateFn = doT.template(regionHTML);
var statsTemplateFn = doT.template(statsHTML);

function yearSpan(years) {
    var s = [];
    var startYear, endYear;
    years.push(10000);
    years.forEach(year => {
        if (year - endYear === 1) {
            endYear = year;
        } else {
            if (startYear) {
                s.push(endYear > startYear ? `${startYear}-${endYear}` : startYear);
            }
            startYear = endYear = year;
        }
    });

    return s.join(', ');
}

var stats = statsRaw.split('\n').map(function (stat) {
    var [force, region, id, ...numbers] = stat.split('\t');
    var [population, current, applications, appointments, ...years] = numbers.map(n => parseFloat(n));

    var applicationYears = yearSpan(years.slice(0, years.length / 2));
    var appointmentYears = yearSpan(years.slice(years.length / 2));

    return {
        force,
        id,
        region,
        population,
        current,
        applications,
        appointments,
        applicationYears,
        appointmentYears
    };
}).filter(s => s.force);

var maxPopulation = Math.max.apply(null, stats.map(s => s.population));

var overall = stats.reduce((a, b) => {
    return {
        'force': 'Overall',
        'id': 'overall',
        'population': a.population + b.population,
        'current': a.current + b.current,
        'applications': a.applications + (b.applications || 0),
        'appointments': a.appointments + (b.appointments || 0)
    };
});

overall.population /= stats.length;
overall.current /= stats.length;
overall.applications /= stats.filter(s => !isNaN(s.applications)).length;
overall.appointments /= stats.filter(s => !isNaN(s.appointments)).length;

stats.push(overall);

function locateForce(lat, lng) {
    reqwest({
        'url': `https://data.police.uk/api/locate-neighbourhood?q=${lat},${lng}`,
        'type': 'json',
        'crossOrigin': true,
        'success': resp => sendEvent('show-force', {'forceId': resp.force})
    });
}

window.embed = function (el) {
    var statsEl = el.querySelector('.js-stats');
    var userLocationEl = el.querySelector('.js-gps');

    window.addEventListener('show-force', evt => {
        var forceStats = stats.find(s => s.id === evt.detail.forceId);
        statsEl.innerHTML = statsTemplateFn({'stats': forceStats, 'max': maxPopulation});
    });

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

    sendEvent('show-force', {'forceId': 'overall'});
};

window.main = function (el) {
    el.querySelector('.js-regions').innerHTML = regions.map(region => {
        var regionForceStats = stats.filter(s => s.region === region.name);
        var forceHTMLs = regionForceStats.map(forceStats => statsTemplateFn({'stats': forceStats, 'max': maxPopulation}));

        return regionTemplateFn({region, forceHTMLs});
    }).join('');
};

iframeMessenger.enableAutoResize();
