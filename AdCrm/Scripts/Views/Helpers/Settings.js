﻿var koModel = {
    filter: { text: ko.obs("") },
    selectedArray: ko.obsa([]),
    grid: $.fn.koGrid.getSaveSettingsObject("/Helpers/Settings#tblSettings", "tblSettings"),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "systemSettings",
            properties: ["comments", "name", "value", "title"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "systemSetting") {
            
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.pager = new ejs.remotePager({
        set: model.systemSettings,
        model: model,
        //pageSize: 20,
        compressPages: true,
        filters: [{
            property: "public",
            value: true,
            type: "bool"
        }, {
            value: function () { return isEmpty(koModel.filter.text()) ? "" : "%" + koModel.filter.text() + "%"; },
            condition: "like", type: "group", property: "group", innerOperand: "or",
            filters: ["name", "title", "value", "comments"]
        }]
    });

    koModel.pager.loading.subscribe(function (value) {
        koModel.selectedArray.removeAll();
        if (value) {
            top.busy("pager");
        } else {
            top.free("pager");
        }
    });

    koModel.filter.text.subscribe(function (value) {
        koModel.pager.refresh();
    });

    koModel.updateAll = function (callback) {
        var valid = true;
        $("#divRightContent form").each(function () {
            valid = valid & $(this).valid();
        });
        if (!valid)
            return false;


        top.busy("UpdateSettings");
        model.update(function () {
            top.free("UpdateSettings");
            if (typeof callback == "function") {
                callback();
            }
            koModel.selectedArray.removeAll();
        });

    };
    
    koModel.create = function () {
        var setting = model.systemSettings.create();
    };

    koModel.remove = function (row) {
        var rows = [];
        if (row.entity) {
            koModel.selectedArray([]);
            rows.push(row);
        } else {
            rows = koModel.selectedArray().select(function (it) { return koModel.systemSettings().first("val=>val.id()==" + it); });
        }

        var names = ["запись", "записи", "записей"];
        var message = ["Вы действительно хотите удалить ",
                       rows.length == 1 ? names[0] + " " + rows[0].name() : rows.length + " " + i18n.declineCount(rows.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (rows.length == 0 || (rows.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }

        rows.forEach(function (it) {
            if (it.id() > 0) {
                it.name(it.name() ? it.name() : "deleted");

                it.deleted(true);
            } else {
                it.entity.remove();
            }
        });
        koModel.updateAll(function () {
            rows.forEach(function (it) {
                it.entity.detach();
            });
            koModel.selectedArray([]);
        });
    };

    //koModel.toExcel = function () {
    //    var rows = koModel.systemSettings();
    //    if (koModel.selectedArray().any()) {
    //        rows = koModel.selectedArray().select(function (it) { return rows.first("val=>val.id()==" + it); });;
    //    }
    //    var headers = ["Номер", "Код", "Название", "Сокращенное", "Примечание"];

    //    var name = ["Задачи_", (new Date()).toSds()].join("");
    //    rows = rows.select(function (it) {
    //        return [it.sortNumber(), it.code(), it.name(), it.shortName(), it.comments()];
    //    });
    //    $.rjson({
    //        url: host.arp + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
    //            if (result.Success) {
    //                window.location = result.Url;
    //            }
    //        }
    //    });
    //};

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblSettings").koGrid({
        koTemplateID: "trSetting",
        headerContainer: $("#divSettingsHeader"),
        styleID: "stlSettingsGrid",
        tableID: "tblSettings",
        columns: gridSettings || [],
        sortable: true,
        sortMethod: koModel.pager.order,
        //source: koModel.workTypes,
        disallowSort: ["Save", "Select"]
    });
    koModel.grid.sorted = grid.sorted;

    ko.apply(koModel);

    if (!koModel.pager.loading() && !koModel.systemSettings().any()) {
        koModel.pager.refresh();
    }
});