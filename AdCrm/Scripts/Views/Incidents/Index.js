var koModel = {};

$(function () {
    var data = ejs.toJsObject(eval("(" + $("#scrData").html() + ")"));
    koModel.user = data.user;
    koModel.calendar = new ejs.calendar({
        data: data,
        userID: data.user.id,
        roleID: data.user.roleID,
        container: "#divCalendar",
        crudClass: "ejsgrid beige",
        gridPadding: 10,
        deletable: deletable,
        editable: editable,
        refreshInterval: 60000,
        showReminder: function (a, b, c, d) { return top.showReminder(a, b, c, d); }
    });

    koModel.calendar.events.dialogOpening.attach(function (e) {
        var t, l;
        var h = Math.max($(top.document).height(), $(top.window).height());
        var frm = $(top.document).find("#frmIncidents");
        t = frm.offset().top;// - $(top.document).scrollTop();
        l = frm.offset().left;

        frm.attr("width", "100%");
        frm.attr("height", "100%");
        frm.css({ width: "100%", height: h + "px", position: "absolute", top: 0, left: 0, zIndex: 999 });

        $("#divCalendar").css({ position: "relative", top: t, left: l });

        e.dialog.dialog("option", "height", h - 150);
    });

    koModel.calendar.events.dialogClosing.attach(function (e) {
        var frm = $(top.document).find("#frmIncidents");
        frm.attr("width", "198");
        frm.attr("height", "235");
        frm.css({ width: "198px", height: "235px", position: "static" });
        $("#divCalendar").css({ position: "static" });
    });

    koModel.calendar.events.crudEditing.attach(function (e) {
        //alert(e.row.id());
    });

    koModel.calendar.events.crudRemoving.attach(function (e) {
        //alert(e.row.id());
    });

    ko.apply(koModel);
});

function deletable(item) {
    if (item.id() < 0 || item.creatorID() == koModel.user.id || koModel.user.roleID <= 2) {
        return true;
    }

    return false;
}

function editable(item) {
    if (item.id() < 0 || item.creatorID() == koModel.user.id || koModel.user.roleID <= 2) {
        return true;
    }

    return false;
}