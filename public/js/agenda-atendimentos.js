$(function () {

  $('.modal').modal();
  $('.collapsible').collapsible();
  $('.tooltipped').tooltip();
  $('select').material_select();

  const $calendar = $('#calendar');
  const $external_events = $('.external-events');
  const $modal_new_event = $('#modal-new-event');

  const _salaId = $('#salaId').data('id');

  const mapColors = {
    //tipo de atendimento
    'Psicológico': '#2196f3', // azul fraco 
    'Psicopedagógico': '#f57f17', //laranja
    'Orientação Profissional': '#9e9e9e', //cinza 
  };

  const mapColorsNewEvent = {
    //tipo de atendimento
    'Reunião': '#000000', // preto 
    'Atividade': '#000000', //preto
    'Entrevista': '#000000', // preto
    'Resolução 33/2015': '#1a237e', //azul forte
    'Alunos Educação Especial': '#1b5e20' //verde forte
  };

  const mapHeaders = {
    'success': 'Sucesso',
    'error': 'Erro',
    'warning': 'Atenção',
    'information': 'Alerta'
  }

  function getColor(tipoAtendimento) {
    return mapColors[$.trim(tipoAtendimento)];
  }

  function getColorNewEvent(tipo) {
    return mapColorsNewEvent[tipo];
  }

  function createExternalEvent(event, type) {
    var color = getColor(event.tipoAtendimento);
    var div = $('<div>')
      .text($.trim(event.nome))
      .addClass('fc-event')
      .draggable({     // make the event draggable using jQuery UI
        zIndex: 999,
        revert: true,      // will cause the event to go back to its
        revertDuration: 0  //  original position after the drag
      })
      .data('event', {     // store data so the calendar knows to render an event upon drop
        title: $.trim(event.nome), // use the element's text as the event title
        duration: "01:00",
        stick: true, // maintain when user navigates (see docs on the renderEvent method)
        color: color, // color when event has been dropped onto the calendar
        constraint: event.id,
        // additional data
        _type: type,
        _externalEventId: event.id,
        _constraints: createConstraintEvents(event.id, event.horarios)
      })
      .data('type', type)
      .css('background-color', color)
      .append(
        `<span class="delete-external-event right">
          <i class="material-icons">delete_forever</i>
         </span>`
      );
    return div;
  }

  const types = {
    solicitacoes: {
      collection: 'solicitacoes',
      sing: 'solicitação',
      plural: 'solicitações',
      external: $('#external-events-solicitacoes'),
      pagination: $('#pagination-solicitacoes'),
      pages: 1
    },
    encaminhamentos: {
      collection: 'encaminhamentos',
      sing: 'encaminhamento',
      plural: 'encaminhamentos',
      external: $('#external-events-encaminhamentos'),
      pagination: $('#pagination-encaminhamentos'),
      pages: 1
    }
  }

  // fetch external events
  function getExternalEvents(type, page) {
    $.getJSON(`/api/${type.collection}/pagination/${page}`)
      .done(function (events) {
        $container = type.external;
        $container.empty();
        $container.append($('<h4>').addClass('header').text(type.plural));
        $.each(events, function (i, event) {
          $container.append(createExternalEvent(event, type.collection));
        });
      })
      .fail(function () {
        alert(`Erro ao recuperar ${type.plural}. Por favor, dentro de alguns instantes, tente recarregar a página.`)
      });
  }

  function createPagination(type) {
    type.pagination.materializePagination({
      align: 'left',
      lastPage: type.pages,
      firstPage: 1,
      useUrlParameter: false,
      onClickCallback: function (requestedPage) {
        getExternalEvents(type, requestedPage);
      }
    });
  }

  function getPagesExternalEvents(type) {
    $.getJSON(`/api/${type.collection}/externalEvents`)
      .done(function (events) {
        type.pages = (events.length > 5) ? Math.ceil((events.length) / 5) : 1;
        type.pagination.empty();
        createPagination(type);
      })
      .fail(function () {
        alert(`Erro ao recuperar ${type.plural}. Por favor, dentro de alguns instantes, tente recarregar a página.`)
      });
  }

  //function to load and reload external events and pagination
  function loadExternalEvents(type) {
    getExternalEvents(type, 1);
    getPagesExternalEvents(type);
  }

  loadExternalEvents(types.solicitacoes);
  loadExternalEvents(types.encaminhamentos);

  $($external_events).on('click', '.fc-event > .delete-external-event',
    function () {
      removeExternalEvent($(this).parent())
    }
  );

  $('#save-new-event').on('click', function () {
    var type = $("#event-type").val();
    var color = getColorNewEvent(type);
    var eventData = {
      title: $('#event-title').val(),
      start: $('#event-start').val(),
      end: $('#event-end').val(),
      color: color,
      type: type,
      salaId: _salaId
    };
    saveEspecialEvent(eventData);
  });

  function removeExternalEvent(externalEvent) {
    var event = $(externalEvent).data('event');
    var type = types[$(externalEvent).data('type')];
    $.ajax({
      method: 'DELETE',
      url: `/api/${type.collection}/${event._externalEventId}`,
      success: function () {
        var singCap = type.sing.charAt(0).toUpperCase() + type.sing.slice(1);
        showResponse(`${singCap} '${event.title}' <b>removido</b> com sucesso!`, 'success');
        $(externalEvent).remove();
        loadExternalEvents(type);
      },
      error: function () {
        showResponse(`Erro ao <b>remover</b> ${type.sing} '${event.title}'.`, 'error');
      }
    });
  }

  function removeEvent(event) {
    $.ajax({
      method: 'DELETE',
      url: '/api/atendimentos/agenda/' + event.id,
      success: function (id) {
        if (id) {
          showResponse(`Atendimento de '${event.title}' <b>removido</b> com sucesso!`, 'success');
          $('#calendar').fullCalendar('removeEvents', event.id);
          if (types[event._type])
            updateSolicitacao(event, false);
          loadExternalEvents(types[event._type]);
        }
      },
      error: function () {
        showResponse(`Erro ao <b>remover</b> atendimento de '${event.title}'.`, 'error');
      }
    });
  }

  function showResponse(msg, type) {
    $.toast({
      heading: mapHeaders[type],
      text: msg,
      showHideTransition: 'slide',
      icon: type
    });
  }

  function saveEvent(event) {
    $.post({
      url: '/api/atendimentos/agenda',
      data: {
        title: event.title,
        start: event.start.format(),
        end: event.end.format(),
        color: event.color,
        externalEventId: event._externalEventId,
        salaId: _salaId,
        type: event._type
      },
      success: function (id) {
        if (id) {
          event.id = id;
          $calendar.fullCalendar('updateEvent', event);
          updateSolicitacao(event, true);
          loadExternalEvents(types[event._type]);
          showResponse(`Atendimento de '${event.title}' agendado com sucesso!`, 'success');
        }
      },
      error: function () {
        $calendar.fullCalendar('removeEvents', event.id);
        showResponse(`Erro ao salvar atendimento de '${event.title}'.`, 'error');
      }
    });
  }

  function saveEspecialEvent(event) {
    $.post({
      url: '/api/atendimentos/agenda',
      data: event,
      success: function (id) {
        if (id) {
          event.id = id;
          event._type = event.type;
          delete event.type;
          $calendar.fullCalendar('renderEvent', event);
          showResponse(`'${event.title}' agendado com sucesso!`, 'success');
        }
      },
      error: function () {
        $calendar.fullCalendar('removeEvents', event.id);
        showResponse(`Erro ao salvar '${event.title}'.`, 'error');
      }
    });
  }

  function updateSolicitacao(event, ja_agendado) {
    $.ajax({
      method: 'PUT',
      url: '/api/' + event._type + '/' + event._externalEventId,
      data: {
        agendado: ja_agendado,
        ultimaModificacao: moment().format()
      }
    });
  }

  function updateEvent(event) {
    $.ajax({
      method: 'PUT',
      url: '/api/atendimentos/agenda' + event.id,
      data: {
        start: event.start.format(),
        end: event.end.format(),
      },
      success: function () {
        showResponse(`Atendimento de '${event.title}' atualizado com sucesso!`, 'success');
      },
      error: function () {
        showResponse(`Erro ao atualizar atendimento de '${event.title}'.`, 'error');
      }
    });
  }

  // page is now ready, initialize the calendar...
  $calendar.fullCalendar({
    header: {
      left: 'prev,next today',
      center: 'title',
      right: 'month,agendaWeek,agendaDay,listWeek'
    },
    defaultView: 'agendaWeek',
    navLinks: true, // can click day/week names to navigate views
    editable: true,
    droppable: true, // this allows things to be dropped onto the calendar
    eventLimit: true, // allow "more" link when too many events,
    eventDurationEditable: false,
    eventStartEditable: false,
    weekends: false,
    allDaySlot: false,
    minTime: '08:00:00',
    maxTime: '20:00:00',
    defaultTimedEventDuration: '01:00:00',
    selectable: true,
    selectHelper: true,
    /* render events from firebase */
    eventSources: [
      '/api/profissionais/agenda/' + _salaId,
      '/api/atendimentos/agenda/' + _salaId
    ],
    /* function loading: Triggered when event or resource fetching starts/stops. */
    loading: function (isLoading) {
      $("#loader-events").css('display', 'block');
    },
    /* function eventAfterAllRender: Triggered after all events have finished rendering. */
    eventAfterAllRender: function (view) {
      $("#loader-events").css('display', 'none');
    },
    /* function eventReceive: Called when a external event has been dropped onto the calendar. */
    eventReceive: function (event) {
      saveEvent(event);
    },
    /* function eventDrop: Triggered when dragging stops and the event has moved to a different day/time. */
    eventDrop: function (event) {
      updateEvent(event);
    },
    /* function drop: Called when a valid external jQuery UI draggable has been dropped onto the calendar. */
    drop: function () {
      // remove the element from the "Draggable Events" list
      $(this).remove();
    },
    /* select method: A method for programmatically selecting a period of time. */
    select: function (start, end) {
      $modal_new_event.modal("open");
      var rounded = start.minute() != 0 ? start.clone().subtract(30, 'minute') : start;
      $("#event-start").val(rounded.format());
      $("#event-end").val(rounded.clone().add(1, 'hour').format());
      $('#calendar').fullCalendar('unselect');
    },
    /* function eventClic: Triggered when the user clicks an event. */
    eventClick: function (event) {
      console.log(event);
      if (event._type) { // if false = profissional
        var decision = confirm("Tem certeza que deseja cancelar esse atendimento?");
        if (decision)
          removeEvent(event);
      }
    }
  });

  // render contraints events (defined in _constraints) of triggered external event
  $external_events.on('mousedown', '.fc-event', function () {
    $calendar.fullCalendar('renderEvents', $(this).data('event')._constraints);
  });

  // remove contraints events (with id defined in _externalEventId) of triggered external event
  $external_events.on('mouseup', '.fc-event', function () {
    $calendar.fullCalendar('removeEvents', $(this).data('event')._externalEventId);
  });

});