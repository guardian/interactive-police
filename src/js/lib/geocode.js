import reqwest from 'reqwest'

const key = 'pk.eyJ1IjoiZ3VhcmRpYW4iLCJhIjoiNHk1bnF4OCJ9.25tK75EuDdgq5GxQKyD6Fg';

export default function geocode(query, fn) {
    reqwest({
        'url': 'https://api.mapbox.com/v4/geocode/mapbox.places/' + encodeURIComponent(query) + '.json?proximity=-0.092703,51.514456&access_token=' + key,
        'type': 'json',
        'crossOrigin': true,
        'error': err => fn(err),
        'success': resp => fn(null, resp)
    });
}
