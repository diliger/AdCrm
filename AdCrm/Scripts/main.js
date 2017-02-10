var IE6 = (navigator.userAgent.indexOf("MSIE 6") >= 0) ? true : false;
var IE7 = (navigator.userAgent.indexOf("MSIE 7") >= 0) ? true : false;
//var iPad = (navigator.userAgent.indexOf("iPad") >= 0) ? true : false;
var iPhone = (navigator.userAgent.indexOf("iPhone") >= 0) ? true : false;
var Android = (navigator.userAgent.indexOf("Android") >= 0) ? true : false;

z = {};
z.alert = function (text, callback) {
    alert(text);
};
z.confirm = function (text, callback) {
    var result = confirm(text);

    return result
};
z.getAddVat = function (v) {
    return v / 100 * 18;
};
z.getRemoveVat = function (v) {
    return v - z.removeVat(v);
};
z.addVat = function (v) {
    return v + z.getAddVat(v);
};
z.removeVat = function (v) {
    return v * 100 / 118;
};
z.percent = function (v, p) {
    return v / 100 * p;
};
z.zeroIfEmpty = function (v) {
    if (!v) {
        return 0;
    }

    return v;
};
z.parseFloat = function (v, d) {
    if (ko.isObs(v)) {
        v = v();
    }
    if (!v) {
        return 0;
    }

    if (typeof d == "undefined") {
        d = 2;
        //if (ko && ko.precision) {
        //    d = ko.precision();
        //}
    }

    var str = v.toString();
    var minus = str.trim().startsWith("-");
    str = str.replace(new RegExp("[^\\d.,]", "gi"), "");
    str = str.replace(new RegExp("[,]", "gi"), ".");
    str = minus ? "-" + str : str;

    if (!str) {
        return 0;
    }

    v = parseFloat(str).toFixed(d);

    return parseFloat(v);
};
z.toDecimalString = function (v, d) {
    if (typeof d == "undefined") {
        d = 2;
        //if (ko && ko.precision) {
        //    d = ko.precision();
        //}
    }

    var minus = false;
    if (ko.isObs(v)) {
        v = v();
    }
    v = z.parseFloat(v, d);
    v = v.toFixed(d);
    minus = v.indexOf("-") == 0;
    v = v.split("").reverse();

    if (minus) {
        v.splice(v.length - 1, 1);
    }

    var r = [];//v[0], v[1], v[2]
    for (var i = 0; i <= d; i++) {
        r.push(v[i]);
    }

    v.splice(0, d + 1);

    for (var i = 0; i < v.length; i++) {
        if (i > 0 && i % 3 == 0) {
            r.push(" ");
        }

        r.push(v[i]);
    }

    if (minus) {
        r.push("-");
    }

    r = r.reverse();

    return r.join("");
};
z.toDs = z.toDecimalString;
z.toTimeFromMinutes = function (ms) {
    if (!ms) {
        return "00:00";
    }

    var h = parseInt(ms / 60);
    var m = ms % 60;

    if (h < 10) {
        h = "0" + h.toString();
    }

    if (m < 10) {
        m = "0" + m.toString();
    }

    return h + ":" + m;
};
z.toTfm = z.toTimeFromMinutes;
z.userSettings = function (value) {
    if (typeof value != "undefined" && typeof value != "function") {
        localStorage.userSettings = JSON.stringify(value);
        return value;
    }

    var settings = {};

    if (localStorage.userSettings) {
        try {
            settings = eval("(" + localStorage.userSettings + ")");
        } catch (ex) {
            settings = {};
        }
    }

    if (typeof value == "function") {
        z.userSettings(value(settings));
    }

    return settings;
};
z.filter = {};
z.filter.parseKeywords = function (keywords) {
    var keywordsArray = [];
    var separate = true;
    var keyword = "";

    for (var i = 0; i < keywords.length; i++) {
        if ((keywords.charAt(i) == " " && separate) || (keywords.charAt(i) == '"' && !separate)) {
            if (keyword) {
                keywordsArray.push(keyword.toLowerCase());
                keyword = "";
            }
            separate = true;
        } else if (keywords.charAt(i) == '"') {
            separate = false;
        } else {
            keyword += keywords.charAt(i);
        }
    }

    if (keyword) {
        keywordsArray.push(keyword.toLowerCase());
    }

    return keywordsArray;
};
z.filter.toRegExp = function (keywords) {
    return new RegExp(z.filter.parseKeywords(keywords).select("val=>RegExp.escape(val)").join("|"), "gi");
};
z.filter.markMatches = function (value, keywords) {
    if (!keywords) {
        return value;
    }

    return value.replace(z.filter.toRegExp(keywords), "<span class='filterResult'>$&</span>");
};

var ajaxRequests = new Array();
var texts = new Object();

$.onServerError = function () {
    top.ajaxRequests.slice(0).forEach(function (it) {
        top.free(it);
    });

    var html = ["<div id='divError'>",
                    "<div class='box'>",
                        "<div class='invalid bold larger'>На сервере произошла ошибка.</div>",
                        "<div class='separator'></div>",
                        "<div>Сообщение об ошибке выслано администратору, приносим извинения за доставленное неудобство.</div>",
                        "<div class='separator'></div>",
                        "<div class='text-center'>",
                            "<input type='button' value='Закрыть' />",
                        "</div>",
                    "</div>",
                "</div>"].join("");

    var div = $("<div/>");

    div.html(html);
    var btn = div.find("input");

    btn.click(function () {
        top.free(div);
        div.remove();
    });

    top.busy(div);
    top.$("body").append(div);
};

if (IE7 || IE6 || iPhone || Android) {
    if (typeof JSON == "undefined") {
        JSON = new Object();
    }
    JSON.stringify = JSON.stringify || function (obj) {
        var t = typeof (obj);
        if (t == "function") {
            return;
        }

        if (t != "object" || obj === null) {
            // simple data type
            if (t == "string") {
                obj = '"' + obj + '"';
            }
            return String(obj);
        }
        else {
            // recurse array or object
            var n, v, json = [], arr = (obj && obj.constructor == Array);
            for (n in obj) {
                //console.warn(n);

                v = obj[n];
                t = typeof (v);
                if (t == "function" || (arr && n == "linqArray")) {
                    continue;
                }
                if (t == "string") {
                    v = '"' + v + '"';
                }
                else if (t == "object" && v !== null) {
                    v = JSON.stringify(v);
                }
                json.push((arr ? "" : '"' + n + '":') + String(v));
            }
            return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
        }
    };
}

$.rjson = function (options) {
    if (options.xdomain && typeof window.XDomainRequest != "undefined") {
        $.xdr(options);
    }

    var url = options.url;
    var data = options.data;
    var async = typeof options.async == "undefined" ? true : options.async;
    var strData = JSON.stringify(data);

    return $.ajax({
        type: "POST",
        url: url,
        data: strData,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        async: async,
        success: function (data) {
            if (typeof options.success == "function") {
                options.success(data);
            }
        },
        error: function (ex) {
            if (ex.statusText == "abort") {
                return;
            }

            if (typeof options.error == "function") {
                options.error(ex);
            }

            //$.onServerError();
        }
    });
};

$.xdr = function (options) {
    //if ($.browser.msie && window.XDomainRequest) {
    // Use Microsoft XDR
    var url = options.url;
    var type = typeof options.type == "undefined" ? "POST" : options.type;
    var contentType = typeof options.contentType == "undefined" ? "application/json; charset=utf-8" : options.contentType;
    var xdr = new XDomainRequest();
    var requestData = options.data;
    if (requestData && typeof requestData != "string" && contentType.contains("json")) {
        requestData = JSON.stringify(requestData);
    }
    xdr.open(type, url);
    xdr.onload = function () {
        var text = xdr.responseText;
        var JSON = $.parseJSON(text);
        if (JSON == null || typeof (JSON) == 'undefined') {
            text = data.firstChild.textContent;
            JSON = $.parseJSON(text);
        }
        if (options.success) {
            options.success(JSON, text);
        }
    };
    xdr.onerror = options.error;
    xdr.send(requestData);
    //}
};

var saveSetting = function (name, value, callback) {
    $.rjson({
        data: { Name: name, Value: JSON.stringify(value) },
        url: (window.ApplicationRootPath ? window.ApplicationRootPath : "/") + "User/SaveSettings",
        success: function (result) {
            if (typeof callback == "function") {
                callback(result);
            }
        },
        error: function (ex) {
            alert(texts.r500);
        }
    });
};

jQuery.fn.numeric = function () {
    return this.each(function () {
        var el = $(this);
        el.keydown(function (e) {
            var key = e.charCode || e.keyCode || 0;
            // allow backspace, tab, delete, arrows, numbers and keypad numbers ONLY
            return !e.altKey && !e.shiftKey && !e.ctrlKey && (
                key == 8 || key == 9 || key == 46 ||
                key == 190 || key == 188 || key == 110 || key == 191 ||
                (key >= 37 && key <= 40) ||
                (key >= 48 && key <= 57) ||
                (key >= 96 && key <= 105));
        });

        el.get(0).validate = function (text) {
            //var text = el.val();
            text += "";
            if (isEmpty(text))
                return;

            var val = text.match(/\d+([^\d]\d+)?/);
            var precision = el.attr("precision");
            if (val) {
                val = val[0];
            } else {
                val = "";
            }
            val = val.replace(/[^\d]/, ".");

            if (precision >= 0) {
                val = Math.round(val * Math.pow(10, precision)) / Math.pow(10, precision);
            }
            //el.val(val);
            //el.change();
            return val * 1;
        }

        el.unbind("blur.numeric");
        el.bind("blur.numeric", function () {
            el.val(el.get(0).validate(el.val()));
            el.change();
        });
        //el.get(0).validate();
    })
};
jQuery.fn.valtext = function () {
    var index;
    var text;
    try {
        index = $(this).get(0).selectedIndex;
        text = $($(this).find("option").get(index)).text();
        return text;
    }
    catch (ex) {
        return "";
    }
};
jQuery.fn.checked = function (val) {
    if (val) {
        $(this).attr("checked", "checked");
    } else if (typeof val != "undefined") {
        $(this).removeAttr("checked");
    } else {
        val = $(this).attr("checked") ? true : false;
    }
    return val;
};
jQuery.fn.readonly = function (val) {
    if (typeof val != "undefined") {
        if (val) {
            $(this).attr("readonly", "readonly");
        } else {
            $(this).removeAttr("readonly");
        }
    } else {
        val = $(this).attr("readonly") ? true : false;
    }
    return val;
};
jQuery.fn.disabled = function (val) {
    if (typeof val != "undefined") {
        if (val) {
            $(this).attr("disabled", "disabled");
        } else {
            $(this).removeAttr("disabled");
        }
    } else {
        val = $(this).attr("disabled") ? true : false;
    }
    return val;
};

if (typeof jQuery.fn.hideOnClick == "undefined") {
    jQuery.fn.hideOnClick = function () {
        var me = $(this);
        me.hover(function () {
            me.data("hover", true);
        }, function () {
            me.data("hover", false);
        });

        $(document).click(function () {
            if (!me.data("hover")) {
                me.hide();
            }
        });
    };
}
jQuery.fn.resizeTimer = function (fn) {
    var me = $(this);
    var oldSize = { w: me.width(), h: me.height() };

    setInterval(function () {
        var newSize = { w: me.outerWidth(), h: me.outerHeight() };

        if (oldSize.w != newSize.w || oldSize.h != newSize.h) {
            fn();
        }

        oldSize = newSize;
    }, 100);
};
jQuery.fn.resizeClick = function (fn) {
    var me = $(this);
    var oldSize = { w: me.width(), h: me.height() };

    $(document).click(function () {
        var newSize = { w: me.outerWidth(), h: me.outerHeight() };

        if (oldSize.w != newSize.w || oldSize.h != newSize.h) {
            fn();
        }

        oldSize = newSize;
    });
};

var busy = function (r) {
    free(r);
    setTimeout(function () {
        if (ajaxRequests.length > 0 && $("#divBusy").size() < 1) {
            $("<div/>").css({ opacity: "0.5" }).attr("id", "divBusy").appendTo("body");
        }
    }, 100);
    ajaxRequests.push(r);
};
var free = function (r) {
    var index = ajaxRequests.indexOf(r);
    if (index >= 0) {
        ajaxRequests.splice(index, 1);
        if (ajaxRequests.length < 1) {
            $("#divBusy").remove();
        }
    }
};

var initDatepicker = function (selector) {
    $(selector).each(function () {
        var s = $(this);
        s.datepicker("destroy");
        s.datepicker({
            onSelect: function (dateText, inst) {
                $(inst.input).change();
            }
        });
        s.click(function () {
            var element = $(s);
            if (!element.disabled()) {
                element.datepicker("show");
            }
        });
        s.change(function () {
            var txt = $(this);
            var val = txt.val();
            try {
                $.datepicker.parseDate($.datepicker._defaults.dateFormat, val);
            } catch (ex) {
                txt.val("");
                txt.change();
            }
        });
        s.attr("autocomplete", "off");
    });
};

var convertJson = function (json) {
    var reg = new RegExp("[/]Date[(](\\d+)[)][/]", "g");
    json = json.replace(reg, " new Date($1)");
    return json;
};

var addTimeZone = function (date, offset) {
    var utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    var result = new Date(utc + (3600000 * offset));
    return result;
}

var parseMvcDate = function (date) {
    var result = new Date(parseInt(date.substr(6)));
    if (typeof top.ApplicationTimeZoneOffset != "undefined") {
        result = addTimeZone(result, top.ApplicationTimeZoneOffset);
    }
    return result;
};

var isMvcDate = function (date) {
    if (typeof date != "string" || !date.startsWith("/")) {
        return false;
    }
    var reg = new RegExp("[/]Date[(][-]?(\\d+)[)][/]", "g");
    return reg.test(date);
};

var isEmpty = function (str) {
    var result;
    result = typeof str == "undefined" || str == null || str == NaN || typeof str.length == "undefined" || str.length < 1;
    return result
};
var isNotEmpty = function (str) {
    return !isEmpty(str);
};
var parseBool = function (str) {
    var result;
    result = str === true || str === "true" || str === "True" || str === 1 || str === "1";
    return result;
}
var parseDate = function (str) {
    if (isMvcDate(str)) {
        return parseMvcDate(str);
    } else {
        return $.datepicker.parseDate($.datepicker._defaults.dateFormat, str);
    }
}

var timer = function (code, delay) {
    var me = this;
    me.code = code;
    me.delay = delay;
    me.id = null;

    run();

    me.run = function (code, delay) {
        if (me.id) {
            clearTimeout(me.id);
        }
        if (code) {
            me.code = code;
        }
        if (delay) {
            me.delay = delay;
        }
        run();
    };
    me.clear = function () {
        clearTimeout(me.id);
    }

    function run() {
        if (me.code && me.delay) {
            me.id = setTimeout(me.code, me.delay);
        }
    }
};

String.prototype.toUpperCaseFirst = function () {
    var s = this;
    if (s.length > 0) {
        s = s.charAt(0).toUpperCase() + s.substr(1);
    }
    return s;
};
String.prototype.toLowerCaseFirst = function () {
    var s = this;
    if (s.length > 0) {
        s = s.charAt(0).toLowerCase() + s.substr(1);
    }
    return s;
};

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str) {
        return this.indexOf(str) == 0;
    };
}

if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (str) {
        return this.substr(this.length - str.length) == str;
    };
}

if (typeof String.prototype.trim != 'function') {
    String.prototype.trim = function () {
        var result = "" + this;
        while (result.startsWith(' ') && result.length > 1) {
            result = result.substr(1);
        }
        while (result.endsWith(' ') && result.length > 1) {
            result = result.substr(0, result.length - 1);
        }
        if (result == ' ') {
            result = '';
        }
        return result;
    };
}

if (typeof String.prototype.contains != 'function') {
    String.prototype.contains = function (it, ignoreCase) {
        var me = this;
        if (ignoreCase) {
            me = me.toLowerCase();
            it = it.toLowerCase();
        }
        return me.indexOf(it) != -1;
    };
}

if (typeof String.prototype.html != 'function') {
    String.prototype.html = function (it) {
        return this.replace("<", "&lt;").replace(">", "&gt;").replace(/\n/g, "<br/>");
    };
}


var toJsName = function (value) {
    if (value === "ID") {
        return "id";
    }

    return value.toLowerCaseFirst();
};

var toServerName = function (value) {
    if (value === "id") {
        return "ID";
    }

    if (value.indexOf("id") == 0) {
        value = "ID" + value.substring(2);
        return value;
    } else {
        return value.toUpperCaseFirst();
    }
};

var toJsObject = function (value) {
    var result = {};

    if (!(value instanceof Array) && typeof value != "object") {
        if (isMvcDate(value)) {
            parseDate(value).toSds();
        }

        return value;
    }

    for (var i in value) {
        var v = value[i]

        if (v == null || v == undefined) {
            v = "";
        } else if (v instanceof Array) {
            v = v.select("val=>toJsObject(val)");
        } else if (typeof v == "object") {
            v = toJsObject(v);
        } else if (isMvcDate(v)) {
            v = parseDate(v).toSds();
        }

        result[toJsName(i)] = v;
    }

    return result;
}

var toServerObject = function (value) {
    var result = {};

    if (value == null || value == undefined) {
        return "";
    }

    if (!(value instanceof Array) && typeof value != "object") {
        return value;
    }

    for (var i in value) {
        var v = value[i]

        if (v == null || v == undefined) {
            v = "";
        } else if (v instanceof Array) {
            v = v.select("val=>toServerObject(val)");
        } else if (typeof v == "object") {
            v = toServerObject(v);
        }

        result[toServerName(i)] = v;
    }

    return result;
};

Date.prototype.toShortDateString = function () {
    return $.datepicker.formatDate($.datepicker._defaults.dateFormat, this);
};
Date.prototype.toSds = Date.prototype.toShortDateString;

Date.prototype.dateDiff = function (dateEnd) {
    dateBegin = this;
    if (typeof dateEnd == 'function') {
        dateEnd = dateEnd();
    }

    if (typeof dateEnd == 'string') {
        dateEnd = parseDate(dateEnd);
    }

    if (!dateBegin || !dateEnd) {
        return;
    }

    var diffMiliseconds = dateEnd - dateBegin;
    return {
        days: parseInt(diffMiliseconds / 1000 / 3600 / 24),
        hours: parseInt(diffMiliseconds / 1000 / 3600),
        minutes: parseInt(diffMiliseconds / 1000 / 60), seconds: parseInt(diffMiliseconds / 1000)
    };
};

RegExp.escape = function (text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

if (typeof ko != "undefined") {
    ko.obs = ko.observable;
    ko.obsa = ko.observableArray;
    ko.apply = ko.applyBindings;
    ko.cmp = ko.computed;
    ko.precision = ko.obs(2);

    ko.dobs = function (v) {
        var r = ko.obs(v);

        r.text = ko.obs(z.toDecimalString(v));

        r.text.subscribe(function (v) {
            r.text(z.toDecimalString(v));
            r(z.parseFloat(v));
        });

        r.subscribe(function (v) {
            r.text(z.toDecimalString(v));
        });

        return r;
    };

    ko.toDobs = function (r) {
        if (r instanceof Array) {
            r.forEach(function (it, i) {
                ko.toDobs(it);
            });

            return;
        }

        if (arguments.length > 1) {
            for (var i = 0; i < arguments.length; i++) {
                ko.toDobs(arguments[i]);
            }

            return;
        }

        r.text = ko.cmp({
            read: function () {
                return z.toDs(r());
            },
            write: function (v) {
                r(z.parseFloat(v));
            }
        });

        return r;
    };

    ko.toDDobs = function (r, p) {
        if (r instanceof Array) {
            r.forEach(function (it, i) {
                ko.toDDobs(it, p);
            });
            return;
        }

        r.text = ko.cmp({
            read: function () {
                return p ? z.toDs(r(), ko.precision()) : z.toDs(r());
            },
            write: function (v) {
                if (p) {
                    r(z.parseFloat(v, ko.precision()));
                } else {
                    r(z.parseFloat(v));
                }
            }
        });

        return r;
    };

    ko.toNobs = function (r) {
        if (r instanceof Array) {
            r.forEach(function (it, i) {
                ko.toNobs(it);
            });

            return;
        }

        if (arguments.length > 1) {
            for (var i = 0; i < arguments.length; i++) {
                ko.toNobs(arguments[i]);
            }

            return;
        }

        r.text = ko.cmp({
            read: function () {
                return ejs.toDs(r(), 0);
            },
            write: function (v) {
                r("");
                r(ejs.parseFloat(v));
            }
        });

        return r;
    };

    ko.get = function (value) {
        if (typeof value == "function") {
            return value();
        } else {
            return value;
        }
    };

    ko.isObs = function (value) {
        return typeof value == "function" && typeof value.subscribe == "function";
    }

    ko.filter = function (params) {
        var result = new ko.obsa([]);

        result.text = ko.obs("");

        result.perform = function () {
            var columns = ko.get(params.columns);
            var source = ko.get(params.source());
            var keywords = typeof params.keywords == "function" ? params.keywords() : typeof params.keywords != "undefined" ? param.keywords : result.text();
            var keywordsArray = z.filter.parseKeywords(keywords);

            if (params.fields) {
                params.fields.forEach(function (field) {
                    var value = ko.get(field.value);

                    if (typeof value == "undefined" || value === null || value === "") {
                        return;
                    }

                    source = source.where(function (it, i) {
                        return ko.get(it[field.name]) == value;
                    });
                });
            }

            if (params.functions) {
                params.functions.forEach(function (fn) {
                    source = source.where(function (it, i) {
                        return fn(it);
                    });
                });
            }

            var filtered = source.where(function (it, i) {
                var found = keywordsArray.select("val=>0");

                columns.forEach(function (col, j) {
                    var originalValue = ko.get(it[columns[j]]).toString();
                    var newValue = originalValue;
                    var value = newValue.toLowerCase();

                    if (typeof it["_fl" + columns[j]] != "function") {
                        it["_fl" + columns[j]] = ko.obs("");
                    }

                    if (typeof it["fl" + columns[j]] != "function") {
                        it["fl" + columns[j]] = ko.cmp(function () {
                            var nv = ko.get(it[columns[j]]).toString();
                            if (nv == originalValue) {
                                return it["_fl" + columns[j]]();
                            } else {
                                originalValue = nv;

                                return nv;
                            }
                        });
                    }

                    it["_fl" + columns[j]](newValue);

                    for (var i = 0; i < keywordsArray.length; i++) {
                        if (value.indexOf(keywordsArray[i]) < 0) {
                            continue;
                        }

                        var reg = new RegExp(RegExp.escape(keywordsArray[i]), "gi");
                        newValue = newValue.replace(reg, "<span class='filterResult'>$&</span>");

                        it["_fl" + columns[j]](newValue);
                        found[i]++;
                    }
                });

                var ismatch = keywordsArray.length < 1 || found.where("val=>val > 0").length == keywordsArray.length;

                if (typeof params.onMatch == "function") {
                    var onmatch = params.onMatch({ item: it, index: i, match: ismatch });
                    ismatch = typeof onmatch != "undefined" ? onmatch : ismatch;
                }

                return ismatch;
            });

            if (typeof params.orderBy == "function") {
                filtered = filtered.orderBy(params.orderBy);
            }

            result(filtered);

            if (typeof params.onPerform == "function") {
                params.onPerform(result);
            }
        };

        result.clear = function () {
            if (params.fields) {
                params.fields.forEach(function (it, i) {
                    if (typeof it.value == "function") {
                        if (typeof it.defaultValue != "undefined") {
                            it.value(it.defaultValue);
                        } else {
                            it.value("");
                        }
                    }
                });
            }

            if (params.keywords) {
                params.keywords("");
            }
            else {
                result.text("");
            }
        };

        if (params.auto) {
            if (params.keywords) {
                params.keywords.subscribe(function () {
                    result.perform();
                });
            }
            else {
                result.text.subscribe(function () {
                    result.perform();
                });
            }

            if (params.fields) {
                params.fields.forEach(function (it, i) {
                    if (ko.isObs(it.value)) {
                        it.value.subscribe(result.perform);
                    }
                });
            }

            if (ko.isObs(params.columns)) {
                params.columns.subscribe(result.perform);
            }
        }

        if (typeof params.source == "function" && params.source.subscribe) {
            params.source.subscribe(function () {
                result.perform();
            });
        }

        return result;
    };

    function generatePager(grid, size, rows, current) {
        var i = 0, maxCount;
        var a;
        if (rows > size) {
            count = maxCount = parseInt(rows / size);
            if (rows > maxCount * size) {
                maxCount++;
                count++;
            }

        }
    }

    ko.pager = function (params) {
        var result = ko.obsa([]);

        result.current = ko.obs(0);
        result.max = ko.obs(0);
        result.pages = ko.obsa([]);
        result.size = ko.obs(params.size);
        result.source = params.source;
        result.from = ko.cmp(function () {
            return result.current() * result.size() + 1;
        });
        result.to = ko.cmp(function () {
            return result.from() + result().length - 1;
        });

        var createPage = function (index, text, middle, from, to) {
            var page = {
                index: index,
                text: text,
                middle: middle ? false : true,
                from: from,
                to: to
            };

            if (from && to) {
                var start = index * params.size + 1;
                var end = (index + 1) * params.size;

                if (end > params.source().length) {
                    end = params.source().length;
                }

                page.title = "(" + start.toString() + " - " + end.toString() + ") " + from + " - " + to;
            }

            return page;
        };

        var fillPager = function () {
            var size = result.size();
            var source = params.source();
            var maxCount = count = parseInt(source.length / size);
            var current = result.current();
            var i = 0;
            var defaultParams = {
                compress: true
            };

            $.extend(defaultParams, params);
            params = defaultParams;

            if (count < source.length / size) {
                count++;
                maxCount++;
            }

            var pages = [];

            if (count > 10) {
                i = current - 5;
                count = current + 5;
                if (i < 0) {
                    count += i * -1;
                    i = 0;
                }
                if (count > maxCount) {
                    i -= count - maxCount + 1;
                    count = maxCount;
                }
            }

            if (params.compress) {
                if (i > 0) {
                    pages.push(createPage(0, "1", false, "", ""));
                    pages.push(createPage(-1, "...", true, "", ""));
                }

                for (; i < count; i++) {
                    pages.push(createPage(i, (i + 1).toString(), false, "", ""));
                }

                if (count < maxCount) {
                    pages.push(createPage(-1, "...", true, "", ""));
                    pages.push(createPage(maxCount - 1, maxCount.toString(), false, "", ""));
                }

                result.max(count);
            } else {
                for (i = 0; i < maxCount; i++) {
                    var from = "";
                    var to = "";

                    if (params.textColumn) {
                        var end = (i + 1) * size;

                        if (end >= source.length) {
                            end = source.length - 1;
                        }

                        from = ko.get(source[i * size][params.textColumn]);
                        to = ko.get(source[end][params.textColumn]);
                    }

                    pages.push(createPage(i, (i + 1).toString(), false, from || "_", to || "_"));
                }

                result.max(maxCount);
            }

            result.pages(pages);
        };

        var dataBind = function () {
            var current = result.current();
            var size = result.size();
            var startIndex = current * size;
            var source = params.source();
            var rows = source.skip(startIndex).take(size);

            result(rows);
        };

        result.next = function () {
            var current = result.current();
            var max = result.max();

            if (current >= max) {
                return;
            }

            current++;
            result.current(current);
        }

        result.previous = function () {
            var current = result.current();
            var min = 0;

            if (current <= min) {
                return;
            }

            current--;
            result.current(current);
        }

        result.current.subscribe(function () {
            fillPager();
            dataBind();
        });

        params.source.subscribe(function () {
            fillPager();
            dataBind();
        });

        result.size.subscribe(function () {
            fillPager();
            dataBind();
        });

        fillPager();
        dataBind();

        return result;
    };

    ko.pager.writeShown = function (pagerString) {
        document.write("<div class='toLeft'><span>Показано</span>&nbsp;<span data-bind=\"text: " + pagerString + ".from() + '-' + " + pagerString + ".to()\"></span>&nbsp;<span>из</span>&nbsp;<span data-bind=\"text: " + pagerString + ".source().length\"></span></div>");
    };

    ko.pager.writeContainer = function (pagerString) {
        document.write("<div data-bind=\"template: { name: 'spnPage_" + pagerString.replace(new RegExp("[.]", "gi"), "_") + "', foreach: " + pagerString + ".pages }\"></div>");
    };

    ko.pager.writeScript = function (pagerString) {
        document.write("<script type=\"text/html\" id=\"spnPage_" + pagerString.replace(new RegExp("[.]", "gi"), "_") + "\"><span> <a href=\"javascript:\" data-bind=\"attr: { href: (middle ? '' : 'javascript:') }, text: text, click: function($data) { " + pagerString + ".current($data.index); }, css: { selected: index == " + pagerString + ".current() }\"></a> </span></script>");
    };

    ko.pager.writeFull = function (pagerString) {
        ko.pager.writeScript(pagerString);
        document.write("<div class=\"pager\">")
        ko.pager.writeShown(pagerString);
        ko.pager.writeContainer(pagerString);
        document.write("</div>")
    };

    ko.bindingHandlers.clickToEdit = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var textEditor = function (span, input) {
                var value = valueAccessor();

                if (ko.isObservable(value)) {
                    value = value();
                }

                span = $(span);
                input = $(input);

                span.click(function () {
                    if (span.disabled())
                        return;
                    input.show();
                    span.hide();
                    input.focus();
                });

                input.blur(function () {
                    value = valueAccessor();

                    if (ko.isObservable(value)) {
                        value = value();
                    }

                    if (!value || !input.val()) {
                        return;
                    }

                    input.hide();
                    span.show();
                });

                input.change(function () {
                    value = valueAccessor();

                    if (ko.isObservable(value)) {
                        value = value();
                    }

                    if (!value || !input.val()) {
                        return;
                    }

                    input.hide();
                    span.show();
                });

                if (value) {
                    input.hide();
                } else {
                    span.hide();
                }
            };

            var span = $(element);
            var input = span.parents(":first").find("input:first, select:first, textarea:first");

            textEditor(span, input);
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        }
    };

    ko.bindingHandlers.numeric = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var vb = allBindingsAccessor().value;
            var value = valueAccessor();
            if (ko.isObservable(value)) {
                value = value();
            }
            element = $(element);
            element.numeric();

            if (vb.subscribe) {
                vb.subscribe(function () {
                    vb(element.get(0).validate(vb()));
                });
            }
            //            if (!value) {
            //                element.numeric("disable");
            //            }
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();
            if (ko.isObservable(value)) {
                value = value();
            }
            element = $(element);
            //            if (!value) {
            //                element.numeric("disable");
            //            } else {
            //                element.numeric("enable");
            //            }
        }
    };

    ko.bindingHandlers.datepicker = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();

            if (ko.isObservable(value)) {
                value = value();
            }

            element = $(element);

            initDatepicker(element);

            if (!value) {
                element.datepicker("disable");
            }
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();

            if (ko.isObservable(value)) {
                value = value();
            }

            element = $(element);

            if (!value) {
                element.datepicker("disable");
            } else {
                element.datepicker("enable");
            }
        }
    };

    ko.bindingHandlers.timepicker = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();
            if (ko.isObservable(value)) {
                value = value();
            }
            element = $(element);
            element.timepicker();
            if (!value) {
                element.timepicker("disable");
            }
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();
            if (ko.isObservable(value)) {
                value = value();
            }
            element = $(element);
            if (!value) {
                element.timepicker("disable");
            } else {
                element.timepicker("enable");
            }
        }
    };

    ko.bindingHandlers.colorpicker = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();
            if (ko.isObservable(value)) {
                value = value();
            }
            element = $(element);
            element.colorPicker();
            element.val(value);
            element.change();
            //            if (!value) {
            //                element.colorPicker("disable");
            //            }
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();
            if (ko.isObservable(value)) {
                value = value();
            }
            element = $(element);
            element.val(value);
            element.change();
        }
    };

    ko.bindingHandlers.dropDown = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var dropDownInit = function (header, content) {
                var value = valueAccessor();

                if (ko.isObservable(value)) {
                    value = value();
                }

                header = $(header);
                content = $(content);

                content.click(function (e) {
                    if (!$(e.target).is("input:text")) {
                        content.hide();
                    }
                    return false;
                });
                content.hideOnClick();

                header.click(function (event) {
                    var div = content;
                    $(".drop-down .content").hide();
                    if (div.data("opened") && div.is(":visible")) {
                        div.data("opened", false);
                        return;
                    }
                    if (div.css("width") == "") {
                        var divWidth = header.width();
                        divWidth = content.width() < divWidth - 10 ? divWidth - 10 : content.width();
                        content.width(divWidth);
                    }

                    if (div.css("left") == "") {
                        alert(2);
                        var left = header.offset().left; // +header.width() / 2 - divWidth / 2;

                        var bodyWidth = $("body").width();
                        left = left + divWidth > bodyWidth ? left - (left + divWidth - bodyWidth + 10) : left;
                        div.css({ left: left });
                    }
                    div.data("hover", true);
                    div.show();
                    setTimeout(function () {
                        div.data("hover", false);
                    }, 10);
                    div.data("opened", true);
                });
            };

            var header = $(element).find("div.header:first");
            if (header.length == 0) {
                header = $(element).find("div:first");
            }
            var content = $(element).find("div.content:first");

            dropDownInit(header, content);
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        }
    };

    ko.bindingHandlers.validate = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            element = $(element);

            element.validate({
                errorClass: "invalid",
                errorPlacement: errorPlacement
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        }
    };

    ko.bindingHandlers.button = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            element = $(element);

            element.button();
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        }
    };

    //ko.bindingHandlers.tab = {
    //    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
    //        var value = valueAccessor();
    //        if (ko.isObservable(value)) {
    //            value = value();
    //        }

    //        element = $(element);
    //        var parent = element.parents("div:first");

    //        element.unbind("click.tab");
    //        element.bind("click.tab", function () {
    //            parent.find("div.tab").addClass("hidden");
    //            parent.find(value).removeClass("hidden");

    //            parent.find(".tabs a").removeClass("selected");
    //            element.addClass("selected");
    //        });
    //    },
    //    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
    //    }
    //};

    //ko.bindingHandlers.tabs = {
    //    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
    //        element = $(element);
    //        var bindings = allBindingsAccessor();

    //        element.tabs({
    //            select: function (e, a) {
    //                if (bindings.select) {
    //                    bindings.select(e, a);
    //                }
    //            }
    //        });
    //        element.tabs('select', 0);
    //    },
    //    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
    //    }
    //};

    ko.bindingHandlers.autocomplete = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = valueAccessor();
            var bindings = allBindingsAccessor();
            var context = bindings.context ? typeof bindings.context == "function" ? bindings.context() : bindings.context : null;
            context = context ? context : viewModel;
            //            if (ko.isObservable(value)) {
            //                value = value();
            //            }

            var onselect = function (event, ui) {
                if (typeof bindings.onselect == "function" && bindings.onselect(event, ui) == false) {
                    return;
                }
                if (typeof bindings.value == "function") {
                    bindings.value(ui.item.value);
                }
                if (bindings.selected) {
                    var selected = bindings.selected;
                    if (ko.isObservable(selected)) {
                        selected = selected();
                    }
                    var source = selected.source ? selected.source : "id";
                    var target = selected.target;
                    var item = ui.item.source;
                    if (typeof source == "function") {
                        source = source();
                    }
                    if (typeof target == "function") {
                        target = target();
                    }
                    source = item[source];
                    if (typeof source == "function") {
                        source = source();
                    }
                    if (typeof context[target] == "function") {
                        context[target](source);
                    } else {
                        context[target] = source;
                    }
                }
            };

            element = $(element);
            element.autocomplete({
                source: Array.isArray(value) ? value : function (arg1, arg2) { return value(arg1, arg2, context); },
                minLength: 0,
                select: onselect,
                change: function (event, ui) {
                    if (typeof bindings.onchange == "function" && bindings.onchange(event, ui, context) == false) {
                        return;
                    }
                    if (!ui.item || !ui.item.source) {
                        if (bindings.selected) {
                            var selected = bindings.selected;
                            if (typeof selected == "function") {
                                selected = selected();
                            }
                            var target = selected.target;
                            if (typeof target == "function") {
                                target = target();
                            }
                            if (typeof context[target] == "function") {
                                context[target]("");
                            } else {
                                context[target] = "";
                            }
                        }
                        if (typeof bindings.value == "function") {
                            bindings.value("");
                        } else {
                            $(element).val("");
                        }
                    } else {
                        onselect(event, ui);
                    }
                }
            });

            element.bind("autocompleteopen.ko", function (event, ui) {
                element.data("state", 1);
                var menu = $(".ui-autocomplete.ui-menu");
                var z = menu.css("z-index");
                if (z == 1)
                    menu.css("z-index", 10);
            });

            element.bind("autocompleteclose.ko", function (event, ui) {
                element.data("state", 0);
            });

            if (!bindingContext.$root.openAutocomplete) {
                bindingContext.$root.openAutocomplete = function (data, e) {
                    var div = $(e.target).parent();
                    var ac = div.find("input");
                    if (ac.data("state") == 1) {
                        ac.data("state", 0);
                        //ac.autocomplete("close");
                    } else {
                        ac.focus().trigger('keydown.autocomplete')
                        ac.autocomplete("search")
                    }
                };
            }
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        }
    };
}

if (!window.i18n) {
    i18n = {};
}

i18n.declineCount = function (val, one, two, five) {
    var t = parseInt((val % 100 > 20) ? val % 10 : val % 20);

    switch (t) {
        case 1:
            return one;

        case 2:
        case 3:
        case 4:
            return two;

        default:
            return five;
    }
};

if ($.datepicker) {
    jQuery(function ($) {
        $.datepicker.regional['ru'] = {
            closeText: 'Закрыть',
            prevText: '&#x3c;Пред',
            nextText: 'След&#x3e;',
            currentText: 'Сегодня',
            monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
            monthNamesShort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
            dayNames: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
            dayNamesShort: ['вск', 'пнд', 'втр', 'срд', 'чтв', 'птн', 'сбт'],
            dayNamesMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
            weekHeader: 'Нед',
            dateFormat: 'dd.mm.yy',
            firstDay: 1,
            isRTL: false,
            showMonthAfterYear: false,
            yearSuffix: '',
            changeYear: true,
            yearRange: "1900:" + ((new Date()).getFullYear() + 5)
        };
        $.datepicker.setDefaults($.datepicker.regional['ru']);
    });
}

$(function () {
    initDatepicker($(".adate"));
    //    if ($.fn.button) {
    //        $("button").button();
    //    }
    $("div#divBusy").remove();
    $(document).keyup(function (args) {
        if (window.koModel && typeof window.koModel.onkeyup == "function") {
            window.koModel.onkeyup(args);
        }
    });

    if (window.host && host.OnLoad) {
        if (typeof host.OnLoad == "function") {
            host.OnLoad();
        }
    }
});

function showReminder(item, callback) {
    if (!$ || !$.fn.dialog || !item) {
        return false;
    }

    var reminderDiv = "divReminder" + Math.round(Math.random() * 1000);
    var div = $("#" + reminderDiv);

    if (div.length == 0) {
        div = ["<div id='" + reminderDiv + "' title='Напоминание'>"];
        div.push("<table class='adjuster'>");
        div.push("<tr><th>Событие:</th>");
        div.push("<td><div class='bold name'></div></td></tr>");
        div.push("<tr><th>Дата:</th>");
        div.push("<td><div class='date'></div></td></tr>");
        div.push("<tr><th>Описание:</th>");
        div.push("<td><div class='content'></div></td></tr>");
        div.push("<tr><th></th>");
        div.push("<td><label><input type='checkbox' class='read'/> Прочитано</label></td>");
        div.push("</tr></table></div>");
        div = div.join("");

        $(body).append(div);
        div = $("#" + reminderDiv);

        div.dialog({
            autoOpen: false,
            modal: true,
            width: 450,
            buttons: [{
                text: "Закрыть",
                click: function () {
                    div.dialog("close");
                }
            }],
            open: function () { },
            close: function () {
                var read = div.find("input.read").checked();
                item.read(read);
                if (typeof callback == "function") {
                    callback(item, div);
                }
            }
        });
    }

    div.find(".name").html(item.name());
    div.find(".date").html(item.date());
    div.find(".content").html(item.comments().html());
    div.dialog("open");
    return true;
};

function hexBlock(hex, index) {
    hex = cutHex(hex);
    var length = hex.length >= 6 ? 2 : 1;
    var pos = hex.length - length - index * length;
    var result = hex.substring(pos, pos + length);
    result = result.length == 1 ? result + result : result;
    return result;
}
function hexToR(h) { return parseInt(hexBlock(h, 2), 16); }
function hexToG(h) { return parseInt(hexBlock(h, 1), 16); }
function hexToB(h) { return parseInt(hexBlock(h, 0), 16); }
function cutHex(h) { return (h.toString().charAt(0) == "#") ? h.substring(1, h.length) : h; }

function hexToRgb(h) {
    return $.format("rgb({0}, {1}, {2})", hexToR(h), hexToG(h), hexToB(h));
}

function hexToRgba(h, alpha) {
    alpha = typeof alpha == "undefined" || isEmpty(alpha + "") ? (parseInt(hexBlock(h, 3), 16) / 255).toFixed(2) : alpha;
    alpha = isEmpty(alpha + "") ? "1" : alpha;
    return $.format("rgba({0}, {1}, {2}, {3})", hexToR(h), hexToG(h), hexToB(h), alpha);
}

window.showTip = function showTip(content, element, css) {
    css = css || "";
    var div = $(".event-alert");
    if (!div.length) {
        div = $("<div class='event-alert'></div>");
        $("body").append(div);
    }
    div.html(content);
    div.attr("class", "event-alert " + css);
    var top, left;

    if (element) {
        element = $(element);
        top = element.offset().top - div.outerHeight();
        left = element.offset().left;
    } else {
        top = window.scrollY + 100;
        left = window.outerWidth - div.outerWidth() - 100;
    }
    div.css("top", top);
    div.css("left", left);
    div.fadeOut(css == "error" ? 5000 : 2500, function () {
        div.css("top", -1000);
        div.css("left", -1000);
        div.show();
    });
};

/*-------for file upload--------*/
function clickIntoFrame(frame, element) {
    $(frame).show().contents().find(element).click();
};
