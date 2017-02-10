/*-- File version 0.0.0.4 from 2012.12.26 --*/
ejs.calendar = function (params) {
    var me = this;
    var uid = ejs.getUniqueNumber();
    var value = (new Date).toSds();
    var crudReady = false;
    var dateFrom, dateTo;
    var timer;
    var reminderOpened = false;

    var settings = {
        container: null,
        gridContainer: null,
        types: [],
        typesDictionary: {},
        set: null,
        model: null,
        incidentModel: null,
        koModel: null,
        containerClass: "",
        gridContainerID: "",
        styleID: "",
        userID: -1,
        roleID: -1,
        crudClass: "ejsgrid",
        gridPadding: 20,
        dialogWidth: 900,
        refreshInterval: -1,
        showReminder: null
    };

    me.events = {
        dialogOpening: ejs.createEvent(),
        dialogClosing: ejs.createEvent(),
        crudEditing: ejs.createEvent(),
        crudRemoving: ejs.createEvent()
    };

    var ctor = function () {
        $.extend(settings, params);
        me.settings = settings;

        settings.containerClass = getContainerClass();
        settings.gridContainerID = getGridContainerID();
        settings.styleID = getStyleID();

        makeModel();
        fillDicitionaries();
        renderStyle();
        render();

        setDates();
        refreshData(function (result) { showReminders(result); });

        runTimer();
    };

    me.closeDialog = function () {
        me.events.dialogClosing.raise({ dialog: me.settings.gridContainer, value: value });
        me.settings.gridContainer.dialog("close");

        runTimer();
    };

    me.openDialog = function () {
        if (timer) {
            clearTimeout(timer);
        }

        me.events.dialogOpening.raise({ dialog: me.settings.gridContainer, value: value });
        me.settings.gridContainer.dialog("option", "title", ejs.gs("Event for the date", "calendar") + ": " + value);
        me.settings.gridContainer.dialog("open");
    };

    me.isCrudReady = function () {
        return crudReady;
    };

    me.value = function () {
        if (arguments.length > 0) {
            value = arguments[0];
            $(me.settings.container).datepicker("setDate", value);
            onSelect(value, $(".selector").datepicker("widget"));
        }

        return value;
    };

    me.getCrud = function () {
        return me.settings.koModel.crud;
    };

    function renderCrud() {
        if (crudReady) {
            return;
        }

        crudReady = true;

        if (!me.settings.gridContainer) {
            var gridContainer = $("<div title='" + ejs.gs("Event for the date", "calendar") + "' class='" + me.settings.crudClass + "' id='" + me.settings.gridContainerID + "'></div>");
            $("body").append(gridContainer);
            me.settings.gridContainer = gridContainer;

            me.settings.gridContainer.dialog({
                autoOpen: false,
                modal: true,
                width: me.settings.dialogWidth,
                height: $(window).height() - 100,
                buttons: [{
                    text: ejs.gs("Close", "calendar"),
                    click: function () {
                        me.closeDialog();
                    }
                }]
            });
        }

        var tp = ejs.crud.getDefaultTextProvider();
        tp.unableDelete = ejs.gs("You can't remove this event!", "calendar");

        var sn = window.location.pathname + "#ejsCalendarIncidentsCrud";
        var s = me.settings.data.userSettings.first("val=>val.name=='" + sn + "'");
        var cols = s ? eval("(" + s.value + ")") : null;

        me.settings.koModel.crud = new ejs.crud({
            koModel: me.settings.koModel,
            model: me.settings.incidentModel,
            set: me.settings.incidentModel.incidents,
            gridSettingsName: sn,
            gridColumnsSettings: cols,
            container: me.settings.gridContainer,
            create: true,
            edit: true,
            remove: true,
            autoSave: true,
            pageSize: 20,
            gridPadding: me.settings.gridPadding,
            pure: true,
            textProvider: tp,
            maxHeight: $(top.document).height() - 50,
            columns:
            [{
                title: ejs.gs("Name", "calendar"),
                name: "name",
                required: true,
                disable: "!editable()"
            }, {
                title: ejs.gs("Type", "calendar"),
                name: "typeID",
                showTemplate: "<div data-bind='html: $data.incidentType().name, attr: { \"class\": $root.getTypeClass($data.incidentType()) }'></div>",
                value: "incidentType().name",
                orderBy: "incidentType.Name",
                type: "select",
                options: "incidentTypes.getActive($data.typeID())",
                required: true,
                disable: "!editable()"
            }, {
                title: ejs.gs("Date", "calendar"),
                name: "date",
                type: "date",
                required: true,
                disable: "!editable()"
            }, {
                title: ejs.gs("Remind", "calendar"),
                name: "remind",
                type: "checkbox",
                visible: "editable"
            }, {
                title: ejs.gs("Remind date", "calendar"),
                name: "remindDate",
                type: "date",
                visible: "editable()&&remind()"
            }, {
                title: ejs.gs("Remind time", "calendar"),
                name: "remindTime",
                editTemplate: "<input type=\"text\" data-bind=\"value: remindTime, timepicker: true, visible: editable()&&remind()\"/>",
                visible: "editable()&&remind()"
            }, {
                title: ejs.gs("Repeat", "calendar"),
                name: "repeat",
                type: "checkbox",
                visible: "editable()"
            }, {
                title: ejs.gs("Repeat interval", "calendar"),
                name: "repeatTypeID",
                value: "repeatType().name",
                orderBy: "repeatType.Name",
                type: "select",
                options: "repeatIntervals.getActive($data.repeatTypeID())",
                optionsText: "name",
                optionsCaption: " ",
                visible: "editable()&&repeat()"
            }, {
                title: ejs.gs("Visible", "calendar"),
                name: "visible",
                type: "checkbox",
                visible: "editable"
            }, {
                title: ejs.gs("For role", "calendar"),
                name: "forRoleID",
                value: "forRole().name",
                orderBy: "role.Name",
                type: "select",
                options: "roles",
                optionsText: "name",
                optionsCaption: " ",
                visible: "editable"
            }, {
                title: ejs.gs("For user", "calendar"),
                name: "forUserID",
                value: "forUser().fullName",
                orderBy: "forUser.Surname,forUser.Name,forUser.Patronymic",
                type: "select",
                options: "$root.incident() ? ($root.incident().forRoleID() ? $root.users.getActive($data.forUserID())().where(\"val=>val.roleID()==\" + $root.incident().forRoleID()) : $root.users.getActive($data.forUserID())) : []",
                optionsText: "fullName",
                optionsCaption: " ",
                visible: "editable"
            }, {
                editOnly: true,
                editRowTemplate: "#scrIncidentUsers",
                visible: "editable"
            }, {
                title: ejs.gs("Comments", "calendar"),
                name: "comments",
                type: "textarea",
                editOnly: true,
                disable: "!editable()"
            }, {
                title: ejs.gs("Read already", "calendar"),
                name: "read",
                editOnly: true,
                type: "checkbox"
            }],
            filters: [{
                property: "date",
                value: function () { return value },
                condition: "=",
                type: "date"
            }, {
                property: "group",
                type: "group",
                value: true,
                condition: "=",
                //innerOperand: "or",
                filters: [{
                    property: "creatorID",
                    value: me.settings.userID,
                    type: "number",
                    operand: "or"
                }, {
                    property: "incidentUser",
                    value: me.settings.userID,
                    type: "number",
                    operand: "or"
                }, {
                    property: "group",
                    type: "group",
                    value: me.settings.userID,
                    operand: "or",
                    filters: [{
                        property: "group",
                        type: "group",
                        value: me.settings.userID,
                        filters: [{
                            property: "forUserID",
                            value: me.settings.userID,
                            type: "number",
                            operand: "or"
                        }, {
                            property: "forUserID",
                            value: me.settings.userID,
                            type: "number",
                            condition: "isNull",
                            operand: "or"
                        }]
                    }, {
                        property: "group",
                        type: "group",
                        value: me.settings.roleID,
                        filters: [{
                            property: "forRoleID",
                            value: me.settings.roleID,
                            type: "number",
                            operand: "or"
                        }, {
                            property: "forRoleID",
                            value: me.settings.roleID,
                            type: "number",
                            condition: "isNull",
                            operand: "or"
                        }]
                    }]
                }]
            }],
            includes: [ejs.cip(me.settings.incidentModel.incidentUsers, true)]
        });

        me.settings.koModel.crud.events.editing.attach(function (e) {
            me.events.crudEditing.raise(e);
        });

        me.settings.koModel.crud.events.removing.attach(function (e) {
            me.events.crudRemoving.raise(e);
        });

        me.settings.koModel.crud.events.creating.attach(function (e) {
            e.row.creatorID(me.settings.userID);
            e.row.date(value);
            e.row.visible(true);
            e.row.read(true);
        });

        me.settings.koModel.crud.events.removed.attach(function (e) {
            var entity = me.settings.model.incidents.getByID(e.row.id());
            if (entity) {
                entity.detach();
                entity.dispose();
            }
        });

        me.settings.koModel.crud.events.saved.attach(function () {
            var entities = me.settings.incidentModel.incidents.load().select("val=>ejs.toJsObject(val.eImport())");
            me.settings.model.incidents.addData(entities);
            refreshDatepicker();
        });

        me.crudEvents = me.settings.koModel.crud.events;
        ko.apply(me.settings.koModel, me.settings.gridContainer.get(0));
        ko.apply(me.settings.koModel, me.settings.koModel.crud.getEditor().getDialog().get(0));
    }

    function makeModel() {
        if (!me.settings.model) {
            me.settings.model = new ejs.model({
                sets: [{
                    name: "incidents",
                    properties: ["name", "date", "typeID", "creatorID", "forUserID", "forRoleID", "comments", "visible", "read", "remind", "remindDate", "remindTime"],
                    belongs: [{ name: "incidentType", fkProperty: "typeID" }]
                }, {
                    name: "incidentTypes",
                    properties: ["name", "color", "backgroundColor", "importance", "deleted"],
                    hasMany: [{ name: "incidents", fkProperty: "typeID" }]
                }]
            });

            me.settings.model.refreshData(me.settings.data.incidentTypes);
            me.settings.types = me.settings.model.incidentTypes.load();
        }

        if (!me.settings.incidentModel) {
            me.settings.incidentModel = new ejs.model({
                sets: [{
                    name: "incidents",
                    properties: ["name", "date", "typeID", "creatorID", "forUserID", "forRoleID", "comments", "visible", "read", "remind", "remindDate", "remindTime", "repeat", "repeatTypeID", "primaryID"],
                    belongs: [{ name: "incidentType", fkProperty: "typeID" }, { name: "forUser", setName: "users", fkProperty: "forUserID" }, { name: "forRole", setName: "roles", fkProperty: "forRoleID" },
                        { name: "repeatType", setName: "repeatIntervals", fkProperty: "repeatTypeID" }],
                    hasMany: ["incidentUsers"]
                }, {
                    name: "incidentTypes",
                    properties: ["name", "color", "backgroundColor", "importance", "deleted"],
                    hasMany: [{ name: "incidents", fkProperty: "typeID" }]
                }, {
                    name: "incidentUsers",
                    properties: ["incidentID", "userID", "custom"],
                    belongs: ["user"]
                }, {
                    name: "repeatIntervals",
                    properties: ["name", "deleted"]
                }, {
                    name: "users",
                    properties: ["fullName", "roleID", "deleted"]
                }, {
                    name: "roles",
                    properties: ["name"]
                }]
            });
        }

        if (!me.settings.koModel) {
            me.settings.koModel = {};
        }

        me.settings.koModel.getTypeClass = getTypeClass;
        me.settings.incidentModel.events.koCreated.attach(function (e) {
            if (e.className == "incident") {
                e.ko.include(["incidentType", "forUser", "forRole", "repeatType", "incidentUsers"]);

                e.ko.deletable = ko.obs(me.settings.deletable ? me.settings.deletable(e.ko) : true);
                e.ko.editable = ko.obs(me.settings.editable ? me.settings.editable(e.ko) : true);
            } else if (e.className == "incidentUser") {
                e.ko.include("user");
            }
        });
        me.settings.model.refreshData(me.settings.data);
        me.settings.incidentModel.refreshData(me.settings.data);
        me.settings.incidentModel.toKo(me.settings.koModel);
        me.settings.set = me.settings.model.incidents;

        me.settings.koModel.createIUser = function () {
            var inc = me.settings.koModel.incident();
            var user = me.settings.koModel.leftUsers().first();
            if (!inc) {
                return;
            }
            if (!user) {
                ejs.alert(ejs.gs("No users left!", "calendar"), ejs.gs("No users left!", "calendar"));
                return;
            }
            var iuser = me.settings.incidentModel.incidentUsers.create();
            iuser.incidentID(inc.id());
            iuser.userID(user.id());
            iuser.custom(true);
        };
        me.settings.koModel.leftUsers = function (row) {
            var id = row ? row.userID() : "";
            var rid = row ? row.id() : "";
            var uid = me.settings.userID;

            var inc = me.settings.koModel.incident();
            var users = me.settings.koModel.users().where("val=>val.id()!='" + uid + "'&&(!val.deleted()||val.id()=='" + id + "')");
            var iusers = inc.incidentUsers().where("val=>val.custom()");
            return users.where(function (it) { return !iusers.any("val=>val.id()!='" + rid + "'&&val.userID()==" + it.id()); });
        };
        me.settings.koModel.removeIUser = function (row) {
            row.entity.remove();
        };
    }

    function render() {
        var container = $(me.settings.container);

        container.addClass(me.settings.containerClass);
        container.datepicker({
            beforeShowDay: beforeShowDay,
            onSelect: onSelect,
            onChangeMonthYear: onChangeMonthYear
        });
    }

    function fillDicitionaries() {
        me.settings.types.forEach(function (it, i) {
            me.settings.typesDictionary[it.id()] = it;
        });
    }

    function renderStyle() {
        var id = me.settings.styleID;
        var style = ["<style type='text/css' id='", id, "'>"];

        me.settings.types.forEach(function (it, i) {
            style.push(".", me.settings.containerClass, " .", getTypeClass(it), " a { background-image:none; background-color: ", it.backgroundColor(), "; color: ", it.color(), ";}\n");
            style.push("#", me.settings.gridContainerID, " td div.", getTypeClass(it), " { background-image:none; background-color: ", it.backgroundColor(), "; color: ", it.color(), ";}\n");
        });

        style.push("</style>");

        var old = $("#" + id);
        old.remove();
        $("head").append(style.join(""));
    }

    function getGridContainerID() {
        return "ejsCalendarGridContainer" + uid;
    }

    function getContainerClass() {
        return "ejsCalendar" + uid;
    }

    function getStyleID() {
        return "stlEjsCalendar" + uid;
    }

    function getTypeClass(t) {
        if (!t || !t.id) {
            return "ejsCalendarDay";
        }
        return "ejsCalendarDay" + t.id();
    }

    function beforeShowDay(date) {
        var events = me.settings.set.load().where(function (it, i) {
            var parseDate = window.parseDate || ejs.parseDate;
            var d = parseDate(it.date());
            return d.getFullYear() == date.getFullYear() && d.getMonth() == date.getMonth() && d.getDate() == date.getDate() && it.visible();
        });
        var event = events.first();

        if (!event) {
            return [true];
        }

        var t = me.settings.typesDictionary[event.typeID()];
        var result = [true, getTypeClass(t), event.name()];

        return result;
    }

    function onSelect(date, ui) {
        value = date;

        if (!crudReady) {
            renderCrud();
        }

        me.settings.koModel.crud.getPager().refresh();
        me.openDialog();
    }

    function setDates(year, month) {
        dateFrom = new Date();
        dateTo = new Date();

        if (year && month) {
            month--;
            dateFrom.setFullYear(year);
            dateTo.setFullYear(year);
            dateFrom.setMonth(month);
            dateTo.setMonth(month);
        }

        dateFrom.setDate(1);
        dateTo.setDate(1);
        dateTo.setMonth(dateTo.getMonth() + 1);
        dateTo.setDate(0);
        dateFrom = dateFrom.toSds();
        dateTo = dateTo.toSds();
    }

    function onChangeMonthYear(year, month, ui) {
        setDates(year, month);

        refreshData();
    }

    function refreshDatepicker() {
        $(me.settings.container).datepicker("refresh");
    }

    function refreshData(callback) {
        if (timer) {
            clearTimeout(timer);
        }

        var date = new Date().toSds();
        var wheres = [ejs.cwp("visible", true, "=", "bool")];
        var w = ejs.cwp("group", me.settings.userID, "=", "group", "and", "",
        [
            ejs.cwp("creatorID", me.settings.userID, "=", "number", "or"),
            ejs.cwp("incidentUser", me.settings.userID, "=", "number", "or"),
            ejs.cwp("group", me.settings.userID, "=", "group", "or", "",
            [
                ejs.cwp("group", me.settings.userID, "=", "group", "and", "",
                [
                    ejs.cwp("forUserID", me.settings.userID, "=", "number", "or"),
                    ejs.cwp("forUserID", me.settings.userID, "isNull", "number", "or")
                ]),
                ejs.cwp("group", me.settings.roleID, "=", "group", "and", "",
                [
                    ejs.cwp("forRoleID", me.settings.roleID, "=", "number", "or"),
                    ejs.cwp("forRoleID", me.settings.roleID, "isNull", "number", "or")
                ])
            ])
        ]);
        wheres.push(w);

        w = ejs.cwp("group", true, "=", "group", "and", "",
        [
            ejs.cwp("date", dateFrom, ">=", "date"), ejs.cwp("date", dateTo, "<=", "date")
            //ejs.cwp("remind", true, "=", "bool", "or"), ejs.cwp("remindDate", date, "<=", "date"), ejs.cwp("read", false, "=", "bool")
        ]);
        wheres.push(w);
        
        me.settings.set.refreshData([]);
        me.settings.set.select(function (result) {
            refreshDatepicker();
            if (typeof callback == "function") {
                callback(result);
            }
            runTimer();
        }, wheres, [ejs.cop("date")]);
    };

    function runTimer() {
        if (timer) {
            clearTimeout(timer);
        }

        if (me.settings.refreshInterval >= 1000) {
            var time = me.settings.refreshInterval;
            timer = setTimeout(timerFn, time);
        }
    };

    var timerFn = function () {
        var time = me.settings.refreshInterval;
        if (reminderOpened || me.settings.model.hasChanges() || me.settings.incidentModel.hasChanges() ||
            me.settings.model.errors && me.settings.model.errors.any() || me.settings.incidentModel.errors && me.settings.incidentModel.errors.any()) {
            timer = setTimeout(timerFn, time);
            return;
        }

        refreshData(function (result) {
            showReminders(result);
        });
    };

    function showReminders(data, index) {
        if (typeof me.settings.showReminder != "function" || index >= data.length) {
            return;
        }
        var now = new Date();
        index = index || 0;

        var item = null;

        while (item == null && index < data.length) {
            item = data[index];
            var date = parseDate(item.remindDate());
            var time = item.remindTime().split(":");
            if (time[0]) {
                date.setHours(time[0]);
            }
            if (time[1]) {
                date.setMinutes(time[1]);
            }

            if (!item.remind() || item.read() || date > now) {
                item = null;
                index++;
            }
        }

        if (item == null)
            return;

        reminderOpened = me.settings.showReminder(item, function (item) {
            if (showReminders(data, index + 1)) {
                return;
            }
            if (me.settings.model.hasChanges()) {
                me.settings.model.update();
            }
            reminderOpened = false;
        });
        return true;
    };

    ctor();
};

ejs.calendar.localization = function () {
    ejs.strings.calendar = {};
    ejs.strings.calendar["Name"] = "Название";
    ejs.strings.calendar["Type"] = "Тип";
    ejs.strings.calendar["Date"] = "Дата";
    ejs.strings.calendar["Comments"] = "Дополнительно";
    ejs.strings.calendar["Visible"] = "Отображать";
    ejs.strings.calendar["For role"] = "Для роли";
    ejs.strings.calendar["For user"] = "Для пользователя";
    ejs.strings.calendar["Event for the date"] = "События на дату";
    ejs.strings.calendar["Close"] = "Закрыть";
    ejs.strings.calendar["You can't remove this event!"] = "Вы не можете удалить это событие!";
    ejs.strings.calendar["Read already"] = "Прочитано";
    ejs.strings.calendar["Remind"] = "Напомнить";
    ejs.strings.calendar["Remind date"] = "Дата напоминания";
    ejs.strings.calendar["Remind time"] = "Время напоминания";
    ejs.strings.calendar["Repeat"] = "Повторять";
    ejs.strings.calendar["Repeat interval"] = "Частота повторения";
    ejs.strings.calendar["No users left!"] = "Больше некого добавить!";
};
ejs.calendar.localization();

