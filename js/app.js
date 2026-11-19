/* Aula · lógica de la interfaz (JavaScript sin dependencias) */
(function () {
  'use strict';

  var STORAGE_KEY = 'aula-datos';
  var THEME_KEY = 'aula-tema';

  var COLORS = [
    { name: 'Verde', value: '#0f7a5c' },
    { name: 'Azul', value: '#1e5bb8' },
    { name: 'Morado', value: '#6a43c2' },
    { name: 'Naranja', value: '#c2560f' },
    { name: 'Rosa', value: '#b3266b' },
    { name: 'Turquesa', value: '#0b7d8c' },
    { name: 'Gris', value: '#4a5568' }
  ];

  var DEFAULT_CLASSES = [
    { id: 'web', name: 'Desarrollo Web', section: '4.º corte · Grupo A', teacher: 'Prof. Laura Gómez', color: '#0f7a5c' },
    { id: 'logica', name: 'Lógica de Programación', section: 'Jornada mañana', teacher: 'Prof. Andrés Ríos', color: '#1e5bb8' },
    { id: 'bd', name: 'Bases de Datos', section: 'Grupo 2', teacher: 'Prof. Natalia Pardo', color: '#6a43c2' },
    { id: 'ingles', name: 'Inglés Técnico', section: 'Nivel B1', teacher: 'Prof. Camila Torres', color: '#c2560f' },
    { id: 'diseno', name: 'Diseño de Interfaces', section: 'Electiva', teacher: 'Prof. Julián Mesa', color: '#b3266b' },
    { id: 'redes', name: 'Redes y Servidores', section: 'Grupo 1', teacher: 'Prof. Óscar Duarte', color: '#0b7d8c' }
  ];

  var TOPICS = {
    web: [
      { title: 'Utilería', items: ['Guía de instalación del editor', 'Atajos de teclado útiles'] },
      { title: '01 · Introducción a HTML', items: ['Tema 1: estructura de un documento', 'Tema 2: etiquetas semánticas', 'Tema 3: formularios', 'Tema 4: accesibilidad básica'] },
      { title: '02 · Introducción a CSS', items: ['Tema 1: selectores y cascada', 'Tema 2: Flexbox', 'Tema 3: Grid', 'Tema 4: diseño responsive'] }
    ],
    _default: [
      { title: 'Material de apoyo', items: ['Programa del curso', 'Bibliografía recomendada'] },
      { title: 'Unidad 1', items: ['Lectura introductoria', 'Taller práctico 1', 'Cuestionario de repaso'] },
      { title: 'Unidad 2', items: ['Presentación de la unidad', 'Taller práctico 2'] }
    ]
  };

  var STUDENTS = ['Sergio Salazar', 'Valentina Ruiz', 'Mateo Cárdenas', 'Daniela Ospina', 'Santiago Herrera', 'Mariana López', 'Juan Pablo Vargas', 'Isabella Castro'];

  var SIMPLE_VIEWS = {
    calendario: { title: 'Calendario', text: 'Aquí verías las fechas de entrega de todas tus clases. Esta sección es parte del ejercicio y no tiene eventos todavía.' },
    revisar: { title: 'Para revisar', text: '¡Todo al día! No hay trabajos pendientes por revisar.' }
  };

  /* ---------- Estado y almacenamiento ---------- */
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && Array.isArray(data.classes)) {
          data.posts = data.posts && typeof data.posts === 'object' ? data.posts : {};
          return data;
        }
      }
    } catch (e) { /* datos corruptos o almacenamiento bloqueado */ }
    return { classes: DEFAULT_CLASSES.slice(), posts: {} };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast('No se pudo guardar en este navegador (modo privado o almacenamiento lleno).');
    }
  }

  var state = loadState();
  var current = { classId: null, tab: 'tablon' };

  /* ---------- Utilidades ---------- */
  var $ = function (sel) { return document.querySelector(sel); };

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'text') el.textContent = v;
        else if (k === 'style') el.setAttribute('style', v);
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function icon(name, cls) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  function initials(text) {
    return text.replace(/^Prof\.\s*/, '').split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  function colorFor(text) {
    var sum = 0;
    for (var i = 0; i < text.length; i++) sum += text.charCodeAt(i);
    return COLORS[sum % COLORS.length].value;
  }

  function findClass(id) {
    return state.classes.filter(function (c) { return c.id === id; })[0] || null;
  }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-visible'); }, 2800);
  }

  var dateFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  /* ---------- Render: lista de clases ---------- */
  function renderGrid() {
    var grid = $('#class-grid');
    grid.textContent = '';
    state.classes.forEach(function (c) {
      var isCustom = !DEFAULT_CLASSES.some(function (d) { return d.id === c.id; });
      var card = h('li', { class: 'card', style: '--c:' + c.color }, [
        h('div', { class: 'card__banner' }, [
          h('h2', { class: 'card__title' }, [
            h('a', { class: 'card__link', href: '#/clase/' + c.id, text: c.name })
          ]),
          h('p', { class: 'card__meta', text: c.section || 'Sin sección' }),
          h('p', { class: 'card__meta', text: c.teacher || '' })
        ]),
        h('button', { class: 'icon-btn card__menu', type: 'button', 'aria-label': 'Opciones de ' + c.name, onclick: function () { toast('Opciones de “' + c.name + '” (demostración)'); } }, [icon('dots')]),
        h('span', { class: 'card__avatar', 'aria-hidden': 'true', text: initials(c.teacher || c.name) }),
        h('div', { class: 'card__body' }, [
          'Próxima entrega',
          h('strong', { text: 'Sin tareas pendientes' })
        ]),
        h('div', { class: 'card__actions' }, [
          h('a', { class: 'icon-btn', href: '#/clase/' + c.id + '/trabajo', 'aria-label': 'Trabajo de clase de ' + c.name, title: 'Trabajo de clase' }, [icon('chart')]),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Carpeta de ' + c.name, title: 'Abrir carpeta', onclick: function () { toast('Carpeta de “' + c.name + '” (demostración)'); } }, [icon('folder')]),
          isCustom ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Eliminar ' + c.name, title: 'Eliminar clase', onclick: function () { deleteClass(c.id); } }, [icon('trash')]) : null
        ])
      ]);
      grid.appendChild(card);
    });

    grid.appendChild(h('li', { style: 'display:contents' }, [
      h('button', { class: 'card card--new', type: 'button', 'data-action': 'new-class' }, [icon('plus'), 'Crear o unirse a una clase'])
    ]));
  }

  function renderSidebarClasses() {
    var list = $('#nav-classes');
    list.textContent = '';
    state.classes.forEach(function (c) {
      list.appendChild(h('li', null, [
        h('a', { class: 'nav__item', href: '#/clase/' + c.id, 'data-nav': 'clase-' + c.id }, [
          h('span', { class: 'nav__dot', style: 'background:' + c.color, 'aria-hidden': 'true', text: c.name.charAt(0).toUpperCase() }),
          h('span', { text: c.name })
        ])
      ]));
    });
  }

  function deleteClass(id) {
    var c = findClass(id);
    if (!c || !window.confirm('¿Eliminar la clase “' + c.name + '”?')) return;
    state.classes = state.classes.filter(function (x) { return x.id !== id; });
    delete state.posts[id];
    saveState();
    renderGrid();
    renderSidebarClasses();
    toast('Clase eliminada');
    var next = $('.card__link') || $('#class-grid .card--new');
    if (next) next.focus();
  }

  /* ---------- Render: detalle de clase ---------- */
  function renderClass(c) {
    var view = $('#view-class');
    view.style.setProperty('--c', c.color);
    $('#class-banner').style.setProperty('--c', c.color);
    $('#class-title').textContent = c.name;
    $('#class-section').textContent = c.section || '';

    // Tablón
    var posts = (state.posts[c.id] || []).slice().reverse();
    var list = $('#post-list');
    list.textContent = '';
    posts.forEach(function (p) {
      list.appendChild(h('li', { class: 'post' }, [
        h('span', { class: 'post__icon', style: '--c:' + c.color }, [icon('user')]),
        h('div', { class: 'post__body' }, [
          h('p', { class: 'post__title', text: 'Tú publicaste un anuncio' }),
          h('p', { class: 'post__date', text: dateFmt.format(new Date(p.date)) }),
          h('p', { class: 'post__text', text: p.text })
        ])
      ]));
    });
    var topics = TOPICS[c.id] || TOPICS._default;
    topics.forEach(function (t) {
      t.items.slice(0, 2).forEach(function (item) {
        list.appendChild(h('li', { class: 'post' }, [
          h('span', { class: 'post__icon', style: '--c:' + c.color }, [icon('doc')]),
          h('div', { class: 'post__body' }, [
            h('p', { class: 'post__title', text: (c.teacher || 'El docente') + ' publicó material: ' + item }),
            h('p', { class: 'post__date', text: '4 abr' })
          ])
        ]));
      });
    });

    // Trabajo de clase
    var topicList = $('#topic-list');
    topicList.textContent = '';
    topics.forEach(function (t) {
      topicList.appendChild(h('section', { class: 'topic', style: '--c:' + c.color }, [
        h('div', { class: 'topic__head' }, [
          h('h2', { text: t.title }),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Opciones del tema ' + t.title, onclick: function () { toast('Opciones del tema (demostración)'); } }, [icon('dots')])
        ]),
        h('ul', null, t.items.map(function (item) {
          return h('li', { class: 'topic__item' }, [
            h('span', { class: 'post__icon', style: '--c:' + c.color }, [icon('doc')]),
            h('span', { class: 'topic__name', text: item }),
            h('span', { class: 'topic__date', text: 'Publicado: 4 abr' })
          ]);
        }))
      ]));
    });

    // Personas
    var tl = $('#teacher-list');
    tl.textContent = '';
    var teacher = c.teacher || 'Docente por asignar';
    tl.appendChild(person(teacher));
    var sl = $('#student-list');
    sl.textContent = '';
    STUDENTS.forEach(function (s) { sl.appendChild(person(s)); });
    $('#student-count').textContent = STUDENTS.length + ' estudiantes';
  }

  function person(name) {
    return h('li', { class: 'person' }, [
      h('span', { class: 'person__avatar', style: 'background:' + colorFor(name), 'aria-hidden': 'true', text: initials(name) }),
      h('span', { text: name })
    ]);
  }

  /* ---------- Pestañas (patrón ARIA tabs) ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));

  function selectTab(name, focus) {
    current.tab = name;
    tabs.forEach(function (t) {
      var on = t.id === 'tab-' + name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    });
    $('#class-banner').hidden = name !== 'tablon';
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      var name = t.id.replace('tab-', '');
      history.replaceState(null, '', '#/clase/' + current.classId + (name === 'tablon' ? '' : '/' + name));
      selectTab(name);
    });
    t.addEventListener('keydown', function (e) {
      var idx = null;
      if (e.key === 'ArrowRight') idx = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') idx = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') idx = 0;
      else if (e.key === 'End') idx = tabs.length - 1;
      if (idx === null) return;
      e.preventDefault();
      tabs[idx].click();
      tabs[idx].focus();
    });
  });

  /* ---------- Enrutado por hash ---------- */
  function showView(id) {
    ['view-home', 'view-class', 'view-simple'].forEach(function (v) {
      document.getElementById(v).hidden = v !== id;
    });
  }

  function setCurrentNav(key) {
    document.querySelectorAll('.nav__item').forEach(function (a) {
      if (a.getAttribute('data-nav') === key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function route() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    var crumbs = $('#crumbs');
    closeDrawer();

    if (parts[0] === 'clase' && findClass(parts[1])) {
      var c = findClass(parts[1]);
      current.classId = c.id;
      renderClass(c);
      showView('view-class');
      selectTab(['trabajo', 'personas'].indexOf(parts[2]) > -1 ? parts[2] : 'tablon');
      crumbs.hidden = false;
      $('#crumb-name').textContent = c.name;
      setCurrentNav('clase-' + c.id);
      document.title = c.name + ' · Aula';
    } else if (SIMPLE_VIEWS[parts[0]]) {
      var v = SIMPLE_VIEWS[parts[0]];
      $('#simple-title').textContent = v.title;
      $('#simple-text').textContent = v.text;
      $('#view-simple .empty__icon use').setAttribute('href', parts[0] === 'calendario' ? '#i-calendar' : '#i-check');
      showView('view-simple');
      crumbs.hidden = true;
      setCurrentNav(parts[0]);
      document.title = v.title + ' · Aula';
    } else {
      current.classId = null;
      renderGrid();
      showView('view-home');
      crumbs.hidden = true;
      setCurrentNav('home');
      document.title = 'Aula · Mis clases';
    }
    window.scrollTo(0, 0);
  }

  /* ---------- Barra lateral / cajón móvil ---------- */
  var menuBtn = $('#btn-menu');
  var scrim = $('#scrim');
  var mobile = window.matchMedia('(max-width: 900px)');

  function syncMenuButton() {
    var open = mobile.matches ? document.body.classList.contains('drawer-open') : !document.body.classList.contains('sidebar-collapsed');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }

  function openDrawer() {
    document.body.classList.add('drawer-open');
    scrim.hidden = false;
    syncMenuButton();
    var first = $('#sidebar .nav__item');
    if (first) first.focus();
  }

  function closeDrawer(returnFocus) {
    if (!document.body.classList.contains('drawer-open')) return;
    document.body.classList.remove('drawer-open');
    scrim.hidden = true;
    syncMenuButton();
    if (returnFocus) menuBtn.focus();
  }

  menuBtn.addEventListener('click', function () {
    if (mobile.matches) {
      if (document.body.classList.contains('drawer-open')) closeDrawer(true);
      else openDrawer();
    } else {
      document.body.classList.toggle('sidebar-collapsed');
      syncMenuButton();
    }
  });
  scrim.addEventListener('click', function () { closeDrawer(true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) closeDrawer(true);
  });
  mobile.addEventListener('change', function () { closeDrawer(); syncMenuButton(); });

  /* ---------- Tema claro / oscuro ---------- */
  var themeBtn = $('#btn-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : prefersDark.matches;
  }

  function syncThemeButton() {
    var dark = isDark();
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
  }

  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* sin almacenamiento */ }
    syncThemeButton();
  });
  prefersDark.addEventListener('change', syncThemeButton);

  /* ---------- Modal: crear clase ---------- */
  var dialog = $('#new-class-dialog');
  var form = $('#new-class-form');
  var nameInput = $('#f-name');
  var nameError = $('#f-name-error');
  var lastTrigger = null;

  var colorRow = $('#color-options');
  COLORS.forEach(function (col, i) {
    colorRow.appendChild(h('label', { class: 'swatch', title: col.name }, [
      h('input', { type: 'radio', name: 'color', value: col.value, checked: i === 0, 'aria-label': col.name }),
      h('span', { style: '--c:' + col.value, 'aria-hidden': 'true' })
    ]));
  });

  function openDialog(trigger) {
    lastTrigger = trigger || document.activeElement;
    form.reset();
    nameInput.removeAttribute('aria-invalid');
    nameError.textContent = '';
    closeDrawer();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    nameInput.focus();
  }

  function closeDialog() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  dialog.addEventListener('close', function () {
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) closeDialog(); // clic en el fondo
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = nameInput.value.trim();
    if (!name) {
      nameInput.setAttribute('aria-invalid', 'true');
      nameError.textContent = 'Escribe un nombre para la clase.';
      nameInput.focus();
      return;
    }
    var data = new FormData(form);
    var c = {
      id: 'c' + Date.now().toString(36),
      name: name,
      section: String(data.get('section') || '').trim(),
      teacher: String(data.get('teacher') || '').trim(),
      color: String(data.get('color') || COLORS[0].value)
    };
    state.classes.push(c);
    saveState();
    renderSidebarClasses();
    lastTrigger = null;
    closeDialog();
    toast('Clase “' + c.name + '” creada');
    if (location.hash === '' || location.hash === '#/') {
      renderGrid();
      var links = document.querySelectorAll('.card__link');
      if (links.length) links[links.length - 1].focus();
    } else {
      location.hash = '#/';
    }
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    if (action === 'new-class') openDialog(el);
    else if (action === 'close-dialog') closeDialog();
  });
  $('#btn-new').addEventListener('click', function (e) { openDialog(e.currentTarget); });

  /* ---------- Publicar anuncio ---------- */
  $('#post-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('#post-text');
    var text = input.value.trim();
    if (!text || !current.classId) return;
    (state.posts[current.classId] = state.posts[current.classId] || []).push({ text: text, date: Date.now() });
    saveState();
    input.value = '';
    renderClass(findClass(current.classId));
    toast('Anuncio publicado');
  });

  /* ---------- Inicio ---------- */
  renderSidebarClasses();
  syncThemeButton();
  syncMenuButton();
  window.addEventListener('hashchange', function () {
    route();
    $('#contenido').focus({ preventScroll: true });
  });
  route();
})();
