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
    var [name, region, id, ...numbers] = stat.split('\t');
    var [population, force, forceNS, applications, applicationsNS, appointments, appointmentsNS, ...years] = numbers.map(n => parseFloat(n));

    var applicationYears = yearSpan(years.slice(0, years.length / 2));
    var appointmentYears = yearSpan(years.slice(years.length / 2));

    return {
        name,
        id,
        region,
        'population': {'bme': population},
        'force': {'bme': force, 'ns': forceNS},
        'applications': isNaN(applications) ? null : {'bme': applications, 'ns': applicationsNS},
        'appointments': isNaN(appointments) ? null : {'bme': appointments, 'ns': appointmentsNS},
        applicationYears,
        appointmentYears
    };
}).filter(s => s.name);

var maxPopulation = Math.max.apply(null, stats.map(s => s.population.bme));

function locateForce(lat, lng) {
    reqwest({
        'url': `https://data.police.uk/api/locate-neighbourhood?q=${lat},${lng}`,
        'type': 'json',
        'crossOrigin': true,
        'success': resp => sendEvent('show-force', {'forceId': resp.force})
    });
}


var scotland = /^(?:AB|CA65(?:A|B|D|E|H[ABDEFGHJLNPQRSWXYZ]|J|L[ABDE])|D(?:D|G(?:1(?:1|2|3|4|9|0|65(?:A|B|D|E|F|G|H[ABDEFGHJLNPQRSWXY]|J[DEFGHJLNPQRSTUWXYZ]|L|N|Q|U|W|X|Y))|2|3|4|5|6|7|8|9))|EH|FK|G[123459678]|HS|IV|K[AWY]|ML|P[AH]|TD(?:1(?:1|2(?:A|B|D|E|H|J|L|N|P|Q|R|S|T|U|W|Y|4(?:A|B|D|E|F|H|J|L|N|QU|W[ADX]|XE|Y)|9)|3|9|0|4|51(?:BT|S[UZ]|T[DEFGHJLNPRSTW]|U[FGHJLSWZ]|W[YZ]|X[ABGHJLNQTUWZ]))|2|3|4|5|6|7|8|9(?:0(?:A|B|D|E|H|J|L|N|P|Q|R|S|T[ABDEFGHLNQUXY]|W|Y|Z)|1|7|8|9))|Z)/;

window.embed = function (el) {
    var statsEl = el.querySelector('.js-stats');
    var userLocationEl = el.querySelector('.js-gps');

    window.addEventListener('show-force', evt => {
        el.querySelector('.placeholder').style.display = 'none';
        el.querySelector('.data').style.display = 'block';
        var forceStats = stats.find(s => s.id === evt.detail.forceId);
        statsEl.innerHTML = statsTemplateFn({'stats': forceStats, 'max': maxPopulation});
    });

    madlib(el.querySelector('.js-postcode'), loc => {
        // locateForce doesn't do NI or Scotland
        if (loc.slice(0, 2).toUpperCase() === 'BT') {
            sendEvent('show-force', {'forceId': 'northern-ireland'});
        } else if (scotland.test(loc.toUpperCase())) {
            sendEvent('show-force', {'forceId': 'scotland'});
        } else {
            geocode(loc, (err, resp) => {
                if (!err) {
                    locateForce(resp.features[0].center[1], resp.features[0].center[0]);
                }
            });
        }
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
};

window.main = function (el) {
    el.querySelector('.js-regions').innerHTML = regions.map(region => {
        var regionForceStats = stats.filter(s => s.region === region.name);
        var forceHTMLs = regionForceStats.map(forceStats => statsTemplateFn({'stats': forceStats, 'max': maxPopulation}));

        return regionTemplateFn({region, forceHTMLs});
    }).join('');

    iframeMessenger.enableAutoResize();
};
