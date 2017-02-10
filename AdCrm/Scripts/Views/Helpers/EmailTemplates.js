var koModel = {
    filter: { text: ko.obs("") },
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "emailTemplates",
            properties: ["name", "sysName", "subject", "body", "creator"]
        }, {
            name: "users",
            properties: ["fullName", "roleID", "email", "blocked"]
        }]
    });

    data = ejs.toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "emailTemplate") {
            //ko.toDobs(e.ko.price);
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.updateAll = function (callback) {
        var valid = true;
        $("#divRightContent form").each(function () {
            valid = valid & $(this).valid();
        });
        if (!valid)
            return false;


        ejs.busy("UpdateEmailTemplates");
        model.update(function () {
            ejs.free("UpdateEmailTemplates");
            if (typeof callback == "function") {
                callback();
            }
        });
    };

    var sn = "/Helpers/EmailTemplates#tblEmailTemplates";
    var s = data.userSettings.first("val=>val.name=='" + sn + "'");
    var cols = null;

    if (s) {
        try {
            cols = eval(s.value)
        } catch (ex) {
            cols = null;
        }
    }

    koModel.emailTemplatesCrud = new ejs.crud({
        koModel: koModel,
        model: model,
        set: model.emailTemplates,
        gridSettingsName: sn,
        gridColumnsSettings: cols,
        //gridParentScroll: "#body",
        gridPadding: 10,
        container: $("#divEmailTemplates"),
        create: true,
        edit: true,
        remove: true,
        autoSave: true,
        pageSize: 20,
        pure: true,
        //selectMany: true,
        //removeField: "deleted",
        columns:
        [{
            title: "Название",
            name: "name"
        }, {
            title: "Название для системы",
            name: "sysName",
            required: true
        }, {
            title: "Тема",
            name: "subject",
            type: "textarea",
            required: true
        }, {
            title: "Тело",
            name: "body",
            showTemplate: "<span data-bind=\"text: body().substr(0,200)\"></span>",
            type: "textarea",
            //editTemplate: "<textarea class='required span5' cols='0' rows='5' data-bind='value: body, ckeditable: true' title='Текст'></textarea>",
            required: true
        }],
        filters: [{
            property: "group",
            value: koModel.filter.likeText,
            condition: "like",
            innerOperand: "or",
            type: "group",
            filters: [{
                property: "name",
                type: "string"
            }, {
                property: "sysName",
                type: "string"
            }, {
                property: "subject",
                type: "string"
            }, {
                property: "body",
                type: "string"
            }]
        }]
    });

    koModel.emailTemplatesCrud.events.created.attach(function (e) {
        e.row.creator(host.ulogin);
    });

    if (!cols) {
        koModel.emailTemplatesCrud.getPager().refresh();
    }

    window.setSize = function () {
        var h = $(window).height();
        var div = $(".right-content .container");
        div.css({ height: h - 40 - div.offset().top + "px" });
    };

    setSize();
    $(window).resize(function () {
        setSize();
    });

    ko.apply(koModel);
});