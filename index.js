var express = require('express');
var Promise = require('bluebird');
var qs = require('qs');
var request = Promise.promisifyAll(require('request').defaults({
    headers: { 'content-type': 'application/json' },
    json: true
}), {multiArgs:true});

var baseAPIUrl = 'http://node.locomote.com/code-task/';

var app = express();

app.use(express.static('public'));

app.get('/api/airlines', function(req, res) {
    request.get(baseAPIUrl + 'airlines').pipe(res);
});

app.get('/api/airports/:search', function(req, res) {
    request.get(baseAPIUrl + 'airports?q=' + req.params.search).pipe(res);
});

app.get('/api/search', function(req, res) {
    if(req.query.date == null || req.query.from == null || req.query.to == null) {
        res.status(400).json({ 'error': 'not all query parameters supplied' });
        return;
    }

    request.getAsync(baseAPIUrl + 'airlines').then(function(response) {
        var airlines = response[1];
        var searchRequests = [];
        for(var i = 0, l = airlines.length; i < l; i++) {
            var airline = airlines[i];
            searchRequests.push(
                request.getAsync(baseAPIUrl + 'flight_search/' + airline.code + '?' + qs.stringify(req.query)).then(function(searchResponse) {
                    if(typeof searchResponse[1] === 'string') {
                        return { 'error': searchResponse[1] };
                    } else {
                        return { 'airline': searchResponse[1][0].airline, 'flights': searchResponse[1] };
                    }
                })
            );
        }

        Promise.all(searchRequests).then(function(searchData) {
            res.json(searchData);
        });
    });
});

app.listen(3000);