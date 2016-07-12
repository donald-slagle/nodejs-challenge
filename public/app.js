var dateFormat = 'YYYY-MM-DD';
var fromSelection;
var toSelection;

$(function() {
    setupAutoComplete();
    searchFlightsSetup();
    $('#date').datepicker({
        format: 'yyyy-mm-dd',
        autoclose: true,
        startDate: new Date()
    });
});

function setupAutoComplete() {
    var airports = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        remote: {
            url: '/api/airports/%SEARCH',
            wildcard: '%SEARCH'
        }
    });

    $('#from, #to').typeahead({
        autoselect: true
    }, {
        name: 'airports',
        display: 'airportName',
        source: airports,
        minLength: 2,
    }).on('typeahead:select', function(ev, suggestion) {
        if(ev.target.id === 'from') {
            fromSelection = suggestion.airportCode;
        } else {
            toSelection = suggestion.airportCode;
        }
    });
}

function searchFlightsSetup() {
    $('#search-form').on('submit', function(e) {
        e.preventDefault();

        var params = {
            from: fromSelection,
            to: toSelection,
            date: $('#date').val()
        };

        var dates = getDates(params.date);

        if (!params.from || !params.to || !params.date) {
            alert('Form is invalid');
            return false;
        }

        $('#result-list').removeClass('hidden');

        for(var i = 0, l = dates.length; i < l; i++) {
            $('#tab-' + i).text(dates[i]);
            $('#result-' + i).html($($('#loader-template').html())[0].outerHTML);
            if(!moment(dates[i], dateFormat).isAfter(moment(), 'day')) {
                renderError('Flights are unavailable for past dates', i, 'warning');
            } else {
                searchFlight(dates[i], params, i);
            }
        }

        return false;
    });
}

function getDates(date) {
    var toReturn = [];
    toReturn.push(moment(date, dateFormat).subtract(2, 'days').format(dateFormat));
    toReturn.push(moment(date, dateFormat).subtract(1, 'days').format(dateFormat));
    toReturn.push(date);
    toReturn.push(moment(date, dateFormat).add(1, 'days').format(dateFormat));
    toReturn.push(moment(date, dateFormat).add(2, 'days').format(dateFormat));

    return toReturn;
}

function searchFlight(date, params, index) {
    params.date = date;
    $.get('/api/search?' + $.param(params), function(data) {
        var dateString = moment(date, dateFormat).format('YYYYMMDD');

        if(data[0].error) {
            renderError(data[0].error, index);
        } else {
            renderFlightData(data, dateString, index);
        }
    });
}

function renderError(msg, index, errType) {
    var errorContainer = $('<div>').addClass('error');
    var msgContainer = $('<span>');

    if(msg == 'date can\'t be past') {
        msgContainer.text('Flights are unavailable for past dates');
        errorContainer.addClass('bg-warning');
    } else {
        msgContainer.text(msg);
        errorContainer.addClass('bg-' + errType);
    }

    errorContainer.append(msgContainer);

    $('#result-' + index).html(errorContainer[0].outerHTML);
}

function renderFlightData(data, dateString, index) {
    var accordionTemplate = $($('#panel-template').html().replace('$tabindex$',index));
        for(var i = 0, l = data.length; i < l; i++) {
            var airlineData = data[i];
            var panelTemplate = $($('#panel-content-template').html().replace('$tabindex$',index).replace(/\$panelindex\$/gi, index + '-' + i));
            panelTemplate.find('a').text(airlineData.airline.name);

            var flights = _.sortBy(airlineData.flights, function(x) { return x.start.dateTime; });
            for(var j = 0, k = flights.length; j < k; j++) {
                var flight = flights[j];
                var row = createFlightTable(flight);
                panelTemplate.find('tbody').append(row);
            }

            accordionTemplate.append(panelTemplate);
        }

        $('#result-' + index).html(accordionTemplate[0].outerHTML);
}

function createFlightTable(flightData) {
    var row = $('<tr>');
    var flightNum = $('<td>').text(flightData.flightNum);
    var from = $('<td>').text(flightData.start.cityName + (flightData.start.stateCode ? ', ' + flightData.start.stateCode : '') + ' ' + flightData.start.countryName);
    var departure = $('<td>').text(moment(flightData.start.dateTime).format('YYYY-MM-DD hh:mm a'));
    var to = $('<td>').text(flightData.finish.cityName + (flightData.finish.stateCode ? ', ' + flightData.finish.stateCode : '') + ' ' + flightData.finish.countryName);
    var arrival = $('<td>').text(moment(flightData.finish.dateTime).format('YYYY-MM-DD hh:mm a'));
    var price = $('<td>').text('$' + flightData.price);

    row.append(flightNum);
    row.append(from);
    row.append(departure);
    row.append(to);
    row.append(arrival);
    row.append(price);

    return row;
}