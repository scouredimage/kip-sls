const https = require('https');

export function getPusherConfig() {
    return {
        logToConsole: true,
        key: process.env.PUSHER_APP_KEY,
        cluster: process.env.PUSHER_APP_CLUSTER,
        authEndpoint: process.env.PUSHER_AUTH_ENDPOINT_RESOLVED,
        forceTLS: true,
    }
}

export function listen(pusher, cb) {
    const channel = pusher.subscribe('private-poll');
    channel.bind('pusher:subscription_succeeded', () => {
        channel.bind('client-poll', (data) => {
            cb(data);
        });
    });
}

export function submit(pusher, response) {
    const channel = pusher.subscribe('private-responses');
    channel.bind('pusher:subscription_succeeded', () => {
        channel.trigger('client-responses', response);
        channel.unbind();
        pusher.unsubscribe('private-responses');
    });
}

export function broadcast(pusher, data, cb) {
    const channel = pusher.subscribe('private-poll');
    channel.bind('pusher:subscription_succeeded', () => {
        channel.trigger('client-poll', data);
        channel.unbind();
        pusher.unsubscribe('private-poll')
        cb();
    });
}

export function collect(pusher, cb) {
    const channel = pusher.subscribe('private-responses');
    channel.bind('client-responses', (data) => {
        cb(data);
    });
}

export const colorPalette = [
    '#4EB0B3',
    '#99C355',
    '#E36B98'
];

export function slide(poll) {
    let section = document.createElement('section');
    section.setAttribute('poll_id', poll.id);
    
    let heading = document.createElement('h3');
    heading.innerHTML = poll.question;
    section.appendChild(heading);

    let choices = document.createElement('choices');
    poll.choices.map((c, i) => {
        let choice = document.createElement('h5');
        choice.setAttribute('style', `color: ${colorPalette[i % colorPalette.length]}`);
        choice.innerHTML = c;
        choices.append(choice);
    });
    section.appendChild(choices);

    let chart = document.createElement('div');
    chart.setAttribute('id', `canvas-${poll.id}`);
    chart.setAttribute('style', "height: 400px; width: 100%;");
    section.appendChild(chart);

    return section;
}

export function allSlides(polls) {
    return polls.map(p => slide(p));
}

export function scan(cb) {
    https.get(process.env.SCAN_ENDPOINT, (response) => {
        let data = '';
        response.on('data', (chunk) => {
            data += chunk;
        });
        response.on('end', () => {
            cb(allSlides(JSON.parse(data).result.items));
        })
    }).on("error", (err) => {
        throw err;
    });
}
