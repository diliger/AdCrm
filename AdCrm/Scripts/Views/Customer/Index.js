$(function () {
    var h = $(window).height() - 280;

    z.userSettings(function (s) {
        if (!s.customerMenu) {
            s.customerMenu = {};
        }

        return s;
    });

    setTimeout(function () {
        $("fieldset.collapsable legend span.title").click(function () {
            $(this).parents("fieldset:first").toggleClass("closed");
        });
    }, 100);

    var toggleSplitter = function () {
        var div = $(this);
        var is = !div.data("collapsed");
        if (is) {
            $("div.left").hide();
            $("div.right").css("margin-left", 0);
        } else {
            $("div.left").show();
            var w = $("div.left").width();
            $("div.right").css("margin-left", w);
        }

        div.data("collapsed", is);
        $("div.splitter").draggable("option", "disabled", is);

        z.userSettings(function (s) {
            s.customerMenu.hidden = is;
            return s;
        });

        setHeight();
    };

    $("div.splitter div.button").click(toggleSplitter);
    $("div.splitter div.line").dblclick(toggleSplitter);

    $("div.splitter div.line").draggable({
        axis: "x",
        revert: true,
        revertDuration: 0,
        stop: function (event, ui) {
            var offset = ui.offset;
            var w = offset.left - 30;

            $("div.left").width(w);
            $("div.right").css("margin-left", w);

            setHeight();

            z.userSettings(function (s) {
                s.customerMenu.width = w;
                return s;
            });

        }
    });

    z.userSettings(function (s) {
        if (s.customerMenu.width) {
            var w = s.customerMenu.width;

            $("div.left").width(w);
            $("div.right").css("margin-left", w);
        }

        if (s.customerMenu.hidden) {
            $(".left").hide();
            $(".right").width("auto");
            $("div.right").css("margin-left", 0);

            $("div.splitter div.button").data("collapsed", true);
            $("div.splitter div.line").draggable("option", "disabled", true);
        }

        return s;
    });

    setHeight();
    loadHtml();

    $(window).resize(function () {
        setHeight();
    });
    $(window).mousemove(function () {
        setHeight();
    });

    var disableAll = function () {
        if (disableAll.inProgress)
            return;
        disableAll.inProgress = true;
        setTimeout(function () {
            var div = $(".eReadOnly");
            div.find("input,select,textarea,.icon.small:not(.save),.edit,.clickToEdit").disabled(true);

            disableAll.inProgress = false;
        }, 500);
    };

    if (host.ur == 4) {
        disableAll();
        $(document).mousemove(disableAll);
    }

    window.onFileSelected = ejs.createEvent();
    window.onFileSelected.attach(function (f) {
        if (f.name.startsWith("contractorFile")) {
            koModel.contractorFile().file().name(f.value);
            koModel.contractorFile().fileName(f.value);
        } else if (f.name.startsWith("worksFile")) {
            if (!f.value.endsWith(".xlsx")) {
                alert("Вы можете импортировать только xlsx документы соответствующего формата!");
                return;
            }
            koModel.worksImport.fileName(f.value);
        }
    });

    window.onFileUploaded = ejs.createEvent();
    window.onFileUploaded.attach(function (item) {
        if (item.name.startsWith("contractorFile")) {
            ejs.free("FileUpload");
            var pf = koModel.contractorFile();
            var file = pf.file();

            if (item.code == 200) {
                file.id(item.file.id);
                file.name(item.file.name);
                pf.fileName(item.file.name);
                pf.fileID(file.id());

                koModel.updateAll();

                $("#divFileDialog").data("result", true);
                $("#divFileDialog").dialog("close");
            } else {
                alert(item.message);
            }
        } else if (item.name.startsWith("worksFile")) {
            ejs.free("FileUpload");

            if (item.code == 200) {
                koModel.worksImport.fileID(item.file.id);

                $("#divImportDialog").data("result", true);
                $("#divImportDialog").dialog("close");
            } else {
                alert(item.message);
            }
        }
    });

    $("#divFileDialog").dialog({
        width: 660,
        buttons: [{
            text: 'OK', click: function () {
                if ($("#divFileDialog form").valid()) {
                    ejs.busy("FileUpload");
                    $("#frmUploadContractorFile").contents().find("form").submit();
                }
            }
        }, {
            text: 'Отмена', click: function () {
                $("#divFileDialog").data("result", false);
                koModel.contractorFile().file().entity.remove();
                koModel.contractorFile().entity.remove();
                $("#divFileDialog").dialog("close");
            }
        }],
        modal: true,
        autoOpen: false,
        open: function () {
            $("#divFileDialog").data("result", "");
        },
        close: function () {
            var pf = koModel.contractorFile();
            if (pf && !$("#divFileDialog").data("result")) {
                if (pf.file()) {
                    pf.file().entity.remove();
                }
                pf.entity.remove();
            }
        }
    });

    var div = $("#divImportDialog");
    div.dialog({
        width: 660,
        buttons: [{
            text: 'OK', click: function () {
                if (div.find("form").valid()) {
                    ejs.busy("FileUpload");
                    div.find("iframe").contents().find("form").submit();
                }
            }
        }, {
            text: 'Отмена', click: function () {
                div.data("result", false);
                div.dialog("close");
            }
        }],
        modal: true,
        autoOpen: false,
        open: function () {
            div.data("result", "");
            koModel.worksImport.fileID("");
            koModel.worksImport.fileName("");
        },
        close: function () {
            if (!div.data("result")) {
                koModel.worksImport.fileID("");
                koModel.worksImport.fileName("");
                return;
            }
            koModel.importWorksSubmit();
        }
    });
});

function loadHtml() {

}

function setHeight() {
    var h = $(window).height() - 200;
    $("div.line").css({ height: 0, paddingTop: 0 });

    var tblh = $("#divCustomerDetails").height();

    $("#divCustomerDetails .tab-content").each(function () {
        var frm = $(this);
        var frmh = frm.height();

        frm.height(h);
    });

    $("#divCustomerDetails,div.left,div.splitter,div.right").height(h);

    h = $("#divCustomerDetails").height();
    h = h / 2;
    $("div.line").css({ height: h, paddingTop: h });

    $(".right .scroll.kogrid").each(function () {
        var grid = $(this);
        var rh = $(".right").height();
        var off = grid.offset().top;
        if (off == 0) {
            return;
        }

        off = off - $(".right").offset().top;
        rh = rh - off - 44;

        grid.css("max-height", rh + "px");
    });

    if (typeof koModel != "undefined") {
        if (koModel.cwcGrid) {
            koModel.cwcGrid.setParentHeight();
        }
        if (koModel.cwGrid) {
            koModel.cwGrid.setParentHeight();
        }
        if (koModel.cdGrid) {
            koModel.cdGrid.setParentHeight();
        }
    }

    var w = $(".excel-tabs-contianer ul li").toArray().sum("val=>$(val).outerWidth()");
    $(".excel-tabs-contianer ul").css("min-width", w);
};