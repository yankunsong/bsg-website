//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

class QRUtil {
  constructor() {}

  static PATTERN_POSITION_TABLE = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170],
  ];

  static G15 =
    (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);

  static G18 =
    (1 << 12) |
    (1 << 11) |
    (1 << 10) |
    (1 << 9) |
    (1 << 8) |
    (1 << 5) |
    (1 << 2) |
    (1 << 0);

  static G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

  static getBCHDigit(data: any) {
    var digit = 0;
    while (data != 0) {
      digit += 1;
      data >>>= 1;
    }
    return digit;
  }

  static getBCHTypeInfo(data: any) {
    var d = data << 10;
    while (this.getBCHDigit(d) - this.getBCHDigit(this.G15) >= 0) {
      d ^= this.G15 << (this.getBCHDigit(d) - this.getBCHDigit(this.G15));
    }
    return ((data << 10) | d) ^ this.G15_MASK;
  }

  static getBCHTypeNumber(data: any) {
    var d = data << 12;
    while (this.getBCHDigit(d) - this.getBCHDigit(this.G18) >= 0) {
      d ^= this.G18 << (this.getBCHDigit(d) - this.getBCHDigit(this.G18));
    }
    return (data << 12) | d;
  }

  static getPatternPosition(typeNumber: any) {
    return this.PATTERN_POSITION_TABLE[typeNumber - 1];
  }

  static getMaskFunction(maskPattern: any) {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000:
        return function (i: number, j: number) {
          return (i + j) % 2 == 0;
        };
      case QRMaskPattern.PATTERN001:
        return function (i: number, j: number) {
          return i % 2 == 0;
        };
      case QRMaskPattern.PATTERN010:
        return function (i: number, j: number) {
          return j % 3 == 0;
        };
      case QRMaskPattern.PATTERN011:
        return function (i: number, j: number) {
          return (i + j) % 3 == 0;
        };
      case QRMaskPattern.PATTERN100:
        return function (i: number, j: number) {
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
        };
      case QRMaskPattern.PATTERN101:
        return function (i: number, j: number) {
          return ((i * j) % 2) + ((i * j) % 3) == 0;
        };
      case QRMaskPattern.PATTERN110:
        return function (i: number, j: number) {
          return (((i * j) % 2) + ((i * j) % 3)) % 2 == 0;
        };
      case QRMaskPattern.PATTERN111:
        return function (i: number, j: number) {
          return (((i * j) % 3) + ((i + j) % 2)) % 2 == 0;
        };

      default:
        throw "bad maskPattern:" + maskPattern;
    }
  }

  static getErrorCorrectPolynomial(errorCorrectLength: any) {
    var a = new qrPolynomial([1], 0);
    for (var i = 0; i < errorCorrectLength; i += 1) {
      a = a.multiply(new qrPolynomial([1, QRMath.qrMath.gexp(i)], 0));
    }
    return a;
  }

  static getLengthInBits(mode: any, type: any) {
    if (1 <= type && type < 10) {
      // 1 - 9

      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 10;
        case QRMode.MODE_ALPHA_NUM:
          return 9;
        case QRMode.MODE_8BIT_BYTE:
          return 8;
        case QRMode.MODE_KANJI:
          return 8;
        default:
          throw "mode:" + mode;
      }
    } else if (type < 27) {
      // 10 - 26

      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 12;
        case QRMode.MODE_ALPHA_NUM:
          return 11;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 10;
        default:
          throw "mode:" + mode;
      }
    } else if (type < 41) {
      // 27 - 40

      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 14;
        case QRMode.MODE_ALPHA_NUM:
          return 13;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 12;
        default:
          throw "mode:" + mode;
      }
    } else {
      throw "type:" + type;
    }
  }

  static getLostPoint(qrcode: any) {
    var moduleCount = qrcode.getModuleCount();

    var lostPoint = 0;

    // LEVEL1

    for (var row = 0; row < moduleCount; row += 1) {
      for (var col = 0; col < moduleCount; col += 1) {
        var sameCount = 0;
        var dark = qrcode.isDark(row, col);

        for (var r = -1; r <= 1; r += 1) {
          if (row + r < 0 || moduleCount <= row + r) {
            continue;
          }

          for (var c = -1; c <= 1; c += 1) {
            if (col + c < 0 || moduleCount <= col + c) {
              continue;
            }

            if (r == 0 && c == 0) {
              continue;
            }

            if (dark == qrcode.isDark(row + r, col + c)) {
              sameCount += 1;
            }
          }
        }

        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5;
        }
      }
    }

    // LEVEL2

    for (var row = 0; row < moduleCount - 1; row += 1) {
      for (var col = 0; col < moduleCount - 1; col += 1) {
        var count = 0;
        if (qrcode.isDark(row, col)) count += 1;
        if (qrcode.isDark(row + 1, col)) count += 1;
        if (qrcode.isDark(row, col + 1)) count += 1;
        if (qrcode.isDark(row + 1, col + 1)) count += 1;
        if (count == 0 || count == 4) {
          lostPoint += 3;
        }
      }
    }

    // LEVEL3

    for (var row = 0; row < moduleCount; row += 1) {
      for (var col = 0; col < moduleCount - 6; col += 1) {
        if (
          qrcode.isDark(row, col) &&
          !qrcode.isDark(row, col + 1) &&
          qrcode.isDark(row, col + 2) &&
          qrcode.isDark(row, col + 3) &&
          qrcode.isDark(row, col + 4) &&
          !qrcode.isDark(row, col + 5) &&
          qrcode.isDark(row, col + 6)
        ) {
          lostPoint += 40;
        }
      }
    }

    for (var col = 0; col < moduleCount; col += 1) {
      for (var row = 0; row < moduleCount - 6; row += 1) {
        if (
          qrcode.isDark(row, col) &&
          !qrcode.isDark(row + 1, col) &&
          qrcode.isDark(row + 2, col) &&
          qrcode.isDark(row + 3, col) &&
          qrcode.isDark(row + 4, col) &&
          !qrcode.isDark(row + 5, col) &&
          qrcode.isDark(row + 6, col)
        ) {
          lostPoint += 40;
        }
      }
    }

    // LEVEL4

    var darkCount = 0;

    for (var col = 0; col < moduleCount; col += 1) {
      for (var row = 0; row < moduleCount; row += 1) {
        if (qrcode.isDark(row, col)) {
          darkCount += 1;
        }
      }
    }

    var ratio =
      Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;

    return lostPoint;
  }
}

class qrcode {
  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------
  PAD0 = 0xec;
  PAD1 = 0x11;

  _typeNumber: any;
  _errorCorrectionLevel: any;

  _modules: any = null;
  _moduleCount = 0;
  _dataCache: any = null;
  _dataList: any = [];
  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  constructor(typeNumber: any, errorCorrectionLevel: ErrorCorrectionLevel) {
    this._typeNumber = typeNumber;
    this._errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
  }

  makeImpl(test: any, maskPattern: any) {
    this._moduleCount = this._typeNumber * 4 + 17;
    this._modules = (function (moduleCount) {
      var modules = new Array(moduleCount);
      for (var row = 0; row < moduleCount; row += 1) {
        modules[row] = new Array(moduleCount);
        for (var col = 0; col < moduleCount; col += 1) {
          modules[row][col] = null;
        }
      }
      return modules;
    })(this._moduleCount);

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this._moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this._moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this._typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    if (this._dataCache == null) {
      this._dataCache = this.createData(
        this._typeNumber,
        this._errorCorrectionLevel,
        this._dataList
      );
    }

    this.mapData(this._dataCache, maskPattern);
  }

  setupPositionProbePattern(row: number, col: number) {
    for (var r = -1; r <= 7; r += 1) {
      if (row + r <= -1 || this._moduleCount <= row + r) continue;

      for (var c = -1; c <= 7; c += 1) {
        if (col + c <= -1 || this._moduleCount <= col + c) continue;

        if (
          (0 <= r && r <= 6 && (c == 0 || c == 6)) ||
          (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this._modules[row + r][col + c] = true;
        } else {
          this._modules[row + r][col + c] = false;
        }
      }
    }
  }

  getBestMaskPattern() {
    var minLostPoint = 0;
    var pattern = 0;

    for (var i = 0; i < 8; i += 1) {
      this.makeImpl(true, i);

      var lostPoint = QRUtil.getLostPoint(this);

      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }

    return pattern;
  }

  setupTimingPattern() {
    for (var r = 8; r < this._moduleCount - 8; r += 1) {
      if (this._modules[r][6] != null) {
        continue;
      }
      this._modules[r][6] = r % 2 == 0;
    }

    for (var c = 8; c < this._moduleCount - 8; c += 1) {
      if (this._modules[6][c] != null) {
        continue;
      }
      this._modules[6][c] = c % 2 == 0;
    }
  }

  setupPositionAdjustPattern() {
    var pos = QRUtil.getPatternPosition(this._typeNumber);

    for (var i = 0; i < pos.length; i += 1) {
      for (var j = 0; j < pos.length; j += 1) {
        var row = pos[i];
        var col = pos[j];

        if (this._modules[row][col] != null) {
          continue;
        }

        for (var r = -2; r <= 2; r += 1) {
          for (var c = -2; c <= 2; c += 1) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
              this._modules[row + r][col + c] = true;
            } else {
              this._modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  setupTypeNumber(test: any) {
    var bits = QRUtil.getBCHTypeNumber(this._typeNumber);

    for (var i = 0; i < 18; i += 1) {
      var mod = !test && ((bits >> i) & 1) == 1;
      this._modules[Math.floor(i / 3)][(i % 3) + this._moduleCount - 8 - 3] =
        mod;
    }

    for (var i = 0; i < 18; i += 1) {
      var mod = !test && ((bits >> i) & 1) == 1;
      this._modules[(i % 3) + this._moduleCount - 8 - 3][Math.floor(i / 3)] =
        mod;
    }
  }

  setupTypeInfo(test: any, maskPattern: any) {
    var data = (this._errorCorrectionLevel << 3) | maskPattern;
    var bits = QRUtil.getBCHTypeInfo(data);

    // vertical
    for (var i = 0; i < 15; i += 1) {
      var mod = !test && ((bits >> i) & 1) == 1;

      if (i < 6) {
        this._modules[i][8] = mod;
      } else if (i < 8) {
        this._modules[i + 1][8] = mod;
      } else {
        this._modules[this._moduleCount - 15 + i][8] = mod;
      }
    }

    // horizontal
    for (var i = 0; i < 15; i += 1) {
      var mod = !test && ((bits >> i) & 1) == 1;

      if (i < 8) {
        this._modules[8][this._moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this._modules[8][15 - i - 1 + 1] = mod;
      } else {
        this._modules[8][15 - i - 1] = mod;
      }
    }

    // fixed module
    this._modules[this._moduleCount - 8][8] = !test;
  }

  mapData(data: any, maskPattern: any) {
    var inc = -1;
    var row = this._moduleCount - 1;
    var bitIndex = 7;
    var byteIndex = 0;
    var maskFunc = QRUtil.getMaskFunction(maskPattern);

    for (var col = this._moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col -= 1;

      while (true) {
        for (var c = 0; c < 2; c += 1) {
          if (this._modules[row][col - c] == null) {
            var dark = false;

            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) == 1;
            }

            var mask = maskFunc(row, col - c);

            if (mask) {
              dark = !dark;
            }

            this._modules[row][col - c] = dark;
            bitIndex -= 1;

            if (bitIndex == -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
        }

        row += inc;

        if (row < 0 || this._moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  createBytes(buffer: any, rsBlocks: any) {
    var offset = 0;

    var maxDcCount = 0;
    var maxEcCount = 0;

    var dcdata = new Array(rsBlocks.length);
    var ecdata = new Array(rsBlocks.length);

    for (var r = 0; r < rsBlocks.length; r += 1) {
      var dcCount = rsBlocks[r].dataCount;
      var ecCount = rsBlocks[r].totalCount - dcCount;

      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = new Array(dcCount);

      for (var i = 0; i < dcdata[r].length; i += 1) {
        dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
      }
      offset += dcCount;

      var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      var rawPoly = new qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

      var modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (var i = 0; i < ecdata[r].length; i += 1) {
        var modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }
    }

    var totalCodeCount = 0;
    for (var i = 0; i < rsBlocks.length; i += 1) {
      totalCodeCount += rsBlocks[i].totalCount;
    }

    var data = new Array(totalCodeCount);
    var index = 0;

    for (var i = 0; i < maxDcCount; i += 1) {
      for (var r = 0; r < rsBlocks.length; r += 1) {
        if (i < dcdata[r].length) {
          data[index] = dcdata[r][i];
          index += 1;
        }
      }
    }

    for (var i = 0; i < maxEcCount; i += 1) {
      for (var r = 0; r < rsBlocks.length; r += 1) {
        if (i < ecdata[r].length) {
          data[index] = ecdata[r][i];
          index += 1;
        }
      }
    }

    return data;
  }

  createData(typeNumber: any, errorCorrectionLevel: any, dataList: any) {
    var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

    var buffer = new qrBitBuffer();

    for (var i = 0; i < dataList.length; i += 1) {
      var data = dataList[i];
      buffer.put(data.getMode(), 4);
      buffer.put(
        data.getLength(),
        QRUtil.getLengthInBits(data.getMode(), typeNumber)
      );
      data.write(buffer);
    }

    // calc num max data.
    var totalDataCount = 0;
    for (var i = 0; i < rsBlocks.length; i += 1) {
      totalDataCount += rsBlocks[i].dataCount;
    }

    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw (
        "code length overflow. (" +
        buffer.getLengthInBits() +
        ">" +
        totalDataCount * 8 +
        ")"
      );
    }

    // end code
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    // padding
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }

    // padding
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(this.PAD0, 8);

      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(this.PAD1, 8);
    }

    return this.createBytes(buffer, rsBlocks);
  }

  addData(data: any, mode: any) {
    mode = mode || "Byte";

    var newData = null;

    switch (mode) {
      case "Numeric":
        newData = new qrNumber(data);
        break;
      case "Alphanumeric":
        newData = new qrAlphaNum(data);
        break;
      case "Byte":
        newData = new qr8BitByte(data);
        break;
      case "Kanji":
        newData = new qrKanji(data);
        break;
      default:
        throw "mode:" + mode;
    }

    this._dataList.push(newData);
    this._dataCache = null;
  }

  isDark(row: number, col: number) {
    if (
      row < 0 ||
      this._moduleCount <= row ||
      col < 0 ||
      this._moduleCount <= col
    ) {
      throw row + "," + col;
    }
    return this._modules[row][col];
  }

  getModuleCount() {
    return this._moduleCount;
  }

  make() {
    if (this._typeNumber < 1) {
      var typeNumber = 1;

      for (; typeNumber < 40; typeNumber++) {
        var rsBlocks = QRRSBlock.getRSBlocks(
          typeNumber,
          this._errorCorrectionLevel
        );
        var buffer = new qrBitBuffer();

        for (var i = 0; i < this._dataList.length; i++) {
          var data = this._dataList[i];
          buffer.put(data.getMode(), 4);
          buffer.put(
            data.getLength(),
            QRUtil.getLengthInBits(data.getMode(), typeNumber)
          );
          data.write(buffer);
        }

        var totalDataCount = 0;
        for (var i = 0; i < rsBlocks.length; i++) {
          totalDataCount += rsBlocks[i].dataCount;
        }

        if (buffer.getLengthInBits() <= totalDataCount * 8) {
          break;
        }
      }

      this._typeNumber = typeNumber;
    }

    this.makeImpl(false, this.getBestMaskPattern());
  }

  createTableTag(cellSize: any, margin: any) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;

    var qrHtml = "";

    qrHtml += '<table style="';
    qrHtml += " border-width: 0px; border-style: none;";
    qrHtml += " border-collapse: collapse;";
    qrHtml += " padding: 0px; margin: " + margin + "px;";
    qrHtml += '">';
    qrHtml += "<tbody>";

    for (var r = 0; r < this.getModuleCount(); r += 1) {
      qrHtml += "<tr>";

      for (var c = 0; c < this.getModuleCount(); c += 1) {
        qrHtml += '<td style="';
        qrHtml += " border-width: 0px; border-style: none;";
        qrHtml += " border-collapse: collapse;";
        qrHtml += " padding: 0px; margin: 0px;";
        qrHtml += " width: " + cellSize + "px;";
        qrHtml += " height: " + cellSize + "px;";
        qrHtml += " background-color: ";
        qrHtml += this.isDark(r, c) ? "#000000" : "#ffffff";
        qrHtml += ";";
        qrHtml += '"/>';
      }

      qrHtml += "</tr>";
    }

    qrHtml += "</tbody>";
    qrHtml += "</table>";

    return qrHtml;
  }

  createSvgTag(cellSize: any, margin: any, alt: any, title: any) {
    var opts = {
      cellSize: undefined,
      margin: undefined,
      alt: undefined,
      title: undefined,
      scalable: undefined,
    };
    if (typeof arguments[0] == "object") {
      // Called by options.
      opts = arguments[0];
      // overwrite cellSize and margin.
      cellSize = opts.cellSize;
      margin = opts.margin;
      alt = opts.alt;
      title = opts.title;
    }

    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;

    // Compose alt property surrogate
    alt = typeof alt === "string" ? { text: alt } : alt || {};
    alt.text = alt.text || null;
    alt.id = alt.text ? alt.id || "qrcode-description" : null;

    // Compose title property surrogate
    title = typeof title === "string" ? { text: title } : title || {};
    title.text = title.text || null;
    title.id = title.text ? title.id || "qrcode-title" : null;

    var size = this.getModuleCount() * cellSize + margin * 2;
    var c,
      mc,
      r,
      mr,
      qrSvg = "",
      rect;

    rect =
      "l" +
      cellSize +
      ",0 0," +
      cellSize +
      " -" +
      cellSize +
      ",0 0,-" +
      cellSize +
      "z ";

    qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
    qrSvg += !opts.scalable
      ? ' width="' + size + 'px" height="' + size + 'px"'
      : "";
    qrSvg += ' viewBox="0 0 ' + size + " " + size + '" ';
    qrSvg += ' preserveAspectRatio="xMinYMin meet"';
    qrSvg +=
      title.text || alt.text
        ? ' role="img" aria-labelledby="' +
          this.escapeXml([title.id, alt.id].join(" ").trim()) +
          '"'
        : "";
    qrSvg += ">";
    qrSvg += title.text
      ? '<title id="' +
        this.escapeXml(title.id) +
        '">' +
        this.escapeXml(title.text) +
        "</title>"
      : "";
    qrSvg += alt.text
      ? '<description id="' +
        this.escapeXml(alt.id) +
        '">' +
        this.escapeXml(alt.text) +
        "</description>"
      : "";
    qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
    qrSvg += '<path d="';

    for (r = 0; r < this.getModuleCount(); r += 1) {
      mr = r * cellSize + margin;
      for (c = 0; c < this.getModuleCount(); c += 1) {
        if (this.isDark(r, c)) {
          mc = c * cellSize + margin;
          qrSvg += "M" + mc + "," + mr + rect;
        }
      }
    }

    qrSvg += '" stroke="transparent" fill="black"/>';
    qrSvg += "</svg>";

    return qrSvg;
  }

  createDataURL(cellSize: any, margin: any) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;

    var size = this.getModuleCount() * cellSize + margin * 2;
    var min = margin;
    var max = size - margin;

    return this.createDataURL2(size, size, (x: any, y: any) => {
      if (min <= x && x < max && min <= y && y < max) {
        var c = Math.floor((x - min) / cellSize);
        var r = Math.floor((y - min) / cellSize);
        return this.isDark(r, c) ? 0 : 1;
      } else {
        return 1;
      }
    });
  }

  createImgTag(cellSize: any, margin: any, alt: any) {
    cellSize = cellSize || 2;
    margin = typeof margin == "undefined" ? cellSize * 4 : margin;

    var size = this.getModuleCount() * cellSize + margin * 2;

    var img = "";
    img += "<img";
    img += '\u0020src="';
    img += this.createDataURL(cellSize, margin);
    img += '"';
    img += '\u0020width="';
    img += size;
    img += '"';
    img += '\u0020height="';
    img += size;
    img += '"';
    if (alt) {
      img += '\u0020alt="';
      img += this.escapeXml(alt);
      img += '"';
    }
    img += "/>";

    return img;
  }

  escapeXml(s: any) {
    var escaped = "";
    for (var i = 0; i < s.length; i += 1) {
      var c = s.charAt(i);
      switch (c) {
        case "<":
          escaped += "&lt;";
          break;
        case ">":
          escaped += "&gt;";
          break;
        case "&":
          escaped += "&amp;";
          break;
        case '"':
          escaped += "&quot;";
          break;
        default:
          escaped += c;
          break;
      }
    }
    return escaped;
  }

  _createHalfASCII(margin: any) {
    var cellSize = 1;
    margin = typeof margin == "undefined" ? cellSize * 2 : margin;

    var size = this.getModuleCount() * cellSize + margin * 2;
    var min = margin;
    var max = size - margin;

    var y, x, r1, r2, p;

    const blocks: any = {
      "██": "█",
      "█ ": "▀",
      " █": "▄",
      "  ": " ",
    };

    const blocksLastLineNoMargin: any = {
      "██": "▀",
      "█ ": "▀",
      " █": " ",
      "  ": " ",
    };

    var ascii = "";
    for (y = 0; y < size; y += 2) {
      r1 = Math.floor((y - min) / cellSize);
      r2 = Math.floor((y + 1 - min) / cellSize);
      for (x = 0; x < size; x += 1) {
        p = "█";

        if (
          min <= x &&
          x < max &&
          min <= y &&
          y < max &&
          this.isDark(r1, Math.floor((x - min) / cellSize))
        ) {
          p = " ";
        }

        if (
          min <= x &&
          x < max &&
          min <= y + 1 &&
          y + 1 < max &&
          this.isDark(r2, Math.floor((x - min) / cellSize))
        ) {
          p += " ";
        } else {
          p += "█";
        }

        // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
        ascii +=
          margin < 1 && y + 1 >= max ? blocksLastLineNoMargin[p] : blocks[p];
      }

      ascii += "\n";
    }

    if (size % 2 && margin > 0) {
      return (
        ascii.substring(0, ascii.length - size - 1) + Array(size + 1).join("▀")
      );
    }

    return ascii.substring(0, ascii.length - 1);
  }

  createASCII(cellSize: any, margin: any) {
    cellSize = cellSize || 1;

    if (cellSize < 2) {
      return this._createHalfASCII(margin);
    }

    cellSize -= 1;
    margin = typeof margin == "undefined" ? cellSize * 2 : margin;

    var size = this.getModuleCount() * cellSize + margin * 2;
    var min = margin;
    var max = size - margin;

    var y, x, r, p;

    var white = Array(cellSize + 1).join("██");
    var black = Array(cellSize + 1).join("  ");

    var ascii = "";
    var line = "";
    for (y = 0; y < size; y += 1) {
      r = Math.floor((y - min) / cellSize);
      line = "";
      for (x = 0; x < size; x += 1) {
        p = 1;

        if (
          min <= x &&
          x < max &&
          min <= y &&
          y < max &&
          this.isDark(r, Math.floor((x - min) / cellSize))
        ) {
          p = 0;
        }

        // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
        line += p ? white : black;
      }

      for (r = 0; r < cellSize; r += 1) {
        ascii += line + "\n";
      }
    }

    return ascii.substring(0, ascii.length - 1);
  }

  renderTo2dContext(context: any, cellSize: any) {
    cellSize = cellSize || 2;
    var length = this.getModuleCount();
    for (var row = 0; row < length; row++) {
      for (var col = 0; col < length; col++) {
        context.fillStyle = this.isDark(row, col) ? "black" : "white";
        context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
      }
    }
  }

  static stringToBytesFuncs = {
    default: function (s: any) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    },
  };

  static stringToBytes(s: any) {
    //qrcode.stringToBytesFuncs["default"];
    var bytes = [];
    for (var i = 0; i < s.length; i += 1) {
      var c = s.charCodeAt(i);
      bytes.push(c & 0xff);
    }
    return bytes;
  }

  createStringToBytes(unicodeData: any, numChars: any) {
    // create conversion map.

    var unicodeMap = (function () {
      var bin = new base64DecodeInputStream(unicodeData);
      var read = function () {
        var b = bin.read();
        if (b == -1) throw "eof";
        return b;
      };

      var count = 0;
      var unicodeMap: any = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode((b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + " != " + numChars;
      }

      return unicodeMap;
    })();

    var unknownChar = "?".charCodeAt(0);

    return function (s: any) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == "number") {
            if ((b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  }

  createDataURL2(width: any, height: any, getPixel: any) {
    var gif = new gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y));
      }
    }

    var b = new byteArrayOutputStream();
    gif.write(b);

    var base64 = new base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return "data:image/gif;base64," + base64;
  }

  //---------------------------------------------------------------------
  // returns qrcode function.
}

//---------------------------------------------------------------------
// QRMode
//---------------------------------------------------------------------

var QRMode = {
  MODE_NUMBER: 1 << 0,
  MODE_ALPHA_NUM: 1 << 1,
  MODE_8BIT_BYTE: 1 << 2,
  MODE_KANJI: 1 << 3,
};

//---------------------------------------------------------------------
// QRErrorCorrectionLevel
//---------------------------------------------------------------------

var QRErrorCorrectionLevel = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

//---------------------------------------------------------------------
// QRMaskPattern
//---------------------------------------------------------------------

var QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7,
};

//---------------------------------------------------------------------
// QRUtil
//---------------------------------------------------------------------

//---------------------------------------------------------------------
// QRMath
//---------------------------------------------------------------------

class QRMath {
  EXP_TABLE: any = new Array(256);
  LOG_TABLE: any = new Array(256);

  static qrMath = new QRMath();

  constructor() {
    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      this.EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      this.EXP_TABLE[i] =
        this.EXP_TABLE[i - 4] ^
        this.EXP_TABLE[i - 5] ^
        this.EXP_TABLE[i - 6] ^
        this.EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      this.LOG_TABLE[this.EXP_TABLE[i]] = i;
    }
  }

  glog(n: any) {
    if (n < 1) {
      throw "glog(" + n + ")";
    }

    return this.LOG_TABLE[n];
  }

  gexp(n: any) {
    while (n < 0) {
      n += 255;
    }

    while (n >= 256) {
      n -= 255;
    }

    return this.EXP_TABLE[n];
  }
}

//---------------------------------------------------------------------
// qrPolynomial
//---------------------------------------------------------------------

class qrPolynomial {
  num: any;
  shift: any;

  constructor(num: any, shift: any) {
    if (typeof num.length == "undefined") {
      throw num.length + "/" + shift;
    }
    this.num = num;
    this.shift = shift;
  }

  _num() {
    var offset = 0;
    while (offset < this.num.length && this.num[offset] == 0) {
      offset += 1;
    }
    var _num = new Array(this.num.length - offset + this.shift);
    for (var i = 0; i < this.num.length - offset; i += 1) {
      _num[i] = this.num[i + offset];
    }
    return _num;
  }

  getAt(index: number) {
    return this._num()[index];
  }

  getLength() {
    return this._num().length;
  }

  multiply(e: any) {
    var num = new Array(this.getLength() + e.getLength() - 1);

    for (var i = 0; i < this.getLength(); i += 1) {
      for (var j = 0; j < e.getLength(); j += 1) {
        num[i + j] ^= QRMath.qrMath.gexp(
          QRMath.qrMath.glog(this.getAt(i)) + QRMath.qrMath.glog(e.getAt(j))
        );
      }
    }

    return new qrPolynomial(num, 0);
  }

  mod(e: any): any {
    if (this.getLength() - e.getLength() < 0) {
      return this;
    }

    var ratio =
      QRMath.qrMath.glog(this.getAt(0)) - QRMath.qrMath.glog(e.getAt(0));

    var num = new Array(this.getLength());
    for (var i = 0; i < this.getLength(); i += 1) {
      num[i] = this.getAt(i);
    }

    for (var i = 0; i < e.getLength(); i += 1) {
      num[i] ^= QRMath.qrMath.gexp(QRMath.qrMath.glog(e.getAt(i)) + ratio);
    }

    // recursive call
    return new qrPolynomial(num, 0).mod(e);
  }
}

//---------------------------------------------------------------------
// QRRSBlock
//---------------------------------------------------------------------

class QRRSBlock {
  static RS_BLOCK_TABLE = [
    // L
    // M
    // Q
    // H

    // 1
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],

    // 2
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],

    // 3
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],

    // 4
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],

    // 5
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],

    // 6
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],

    // 7
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],

    // 8
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],

    // 9
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],

    // 10
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],

    // 11
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],

    // 12
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],

    // 13
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],

    // 14
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],

    // 15
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],

    // 16
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],

    // 17
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],

    // 18
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],

    // 19
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],

    // 20
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],

    // 21
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],

    // 22
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],

    // 23
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],

    // 24
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],

    // 25
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],

    // 26
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],

    // 27
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],

    // 28
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],

    // 29
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],

    // 30
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],

    // 31
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],

    // 32
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],

    // 33
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],

    // 34
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],

    // 35
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],

    // 36
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],

    // 37
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],

    // 38
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],

    // 39
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],

    // 40
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16],
  ];

  totalCount: number;
  dataCount: number;

  constructor(totalCount: number, dataCount: number) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  static getRsBlockTable(typeNumber: any, errorCorrectionLevel: any) {
    switch (errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L:
        return this.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M:
        return this.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q:
        return this.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H:
        return this.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return undefined;
    }
  }

  static getRSBlocks(typeNumber: number, errorCorrectionLevel: number) {
    var rsBlock = this.getRsBlockTable(typeNumber, errorCorrectionLevel);

    if (typeof rsBlock == "undefined") {
      throw (
        "bad rs block @ typeNumber:" +
        typeNumber +
        "/errorCorrectionLevel:" +
        errorCorrectionLevel
      );
    }

    var length = rsBlock.length / 3;

    var list = [];

    for (var i = 0; i < length; i += 1) {
      var count = rsBlock[i * 3 + 0];
      var totalCount = rsBlock[i * 3 + 1];
      var dataCount = rsBlock[i * 3 + 2];

      for (var j = 0; j < count; j += 1) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }

    return list;
  }
}

//---------------------------------------------------------------------
// qrBitBuffer
//---------------------------------------------------------------------

class qrBitBuffer {
  _buffer: number[] = [];
  _length: number = 0;

  getBuffer() {
    return this._buffer;
  }

  getAt(index: number) {
    var bufIndex = Math.floor(index / 8);
    return ((this._buffer[bufIndex] >>> (7 - (index % 8))) & 1) == 1;
  }

  put(num: number, length: number) {
    for (var i = 0; i < length; i += 1) {
      this.putBit(((num >>> (length - i - 1)) & 1) == 1);
    }
  }

  getLengthInBits() {
    return this._length;
  }

  putBit(bit: any) {
    var bufIndex = Math.floor(this._length / 8);
    if (this._buffer.length <= bufIndex) {
      this._buffer.push(0);
    }

    if (bit) {
      this._buffer[bufIndex] |= 0x80 >>> this._length % 8;
    }

    this._length += 1;
  }
}

//---------------------------------------------------------------------
// qrNumber
//---------------------------------------------------------------------

class qrNumber {
  _mode = QRMode.MODE_NUMBER;
  _data: any;

  constructor(data: any) {
    this._data = data;
  }

  getMode() {
    return this._mode;
  }

  getLength(buffer: any) {
    return this._data.length;
  }

  write(buffer: any) {
    var data = this._data;

    var i = 0;

    while (i + 2 < data.length) {
      buffer.put(this.strToNum(data.substring(i, i + 3)), 10);
      i += 3;
    }

    if (i < data.length) {
      if (data.length - i == 1) {
        buffer.put(this.strToNum(data.substring(i, i + 1)), 4);
      } else if (data.length - i == 2) {
        buffer.put(this.strToNum(data.substring(i, i + 2)), 7);
      }
    }
  }

  strToNum(s: any) {
    var num = 0;
    for (var i = 0; i < s.length; i += 1) {
      num = num * 10 + this.chatToNum(s.charAt(i));
    }
    return num;
  }

  chatToNum(c: any) {
    if ("0" <= c && c <= "9") {
      return c.charCodeAt(0) - "0".charCodeAt(0);
    }
    throw "illegal char :" + c;
  }
}

//---------------------------------------------------------------------
// qrAlphaNum
//---------------------------------------------------------------------

class qrAlphaNum {
  _mode: any = QRMode.MODE_ALPHA_NUM;
  _data: any;

  constructor(data: any) {
    this._data = data;
  }
  getMode() {
    return this._mode;
  }

  getLength(buffer: any) {
    return this._data.length;
  }

  write(buffer: any) {
    var s = this._data;

    var i = 0;

    while (i + 1 < s.length) {
      buffer.put(
        this.getCode(s.charAt(i)) * 45 + this.getCode(s.charAt(i + 1)),
        11
      );
      i += 2;
    }

    if (i < s.length) {
      buffer.put(this.getCode(s.charAt(i)), 6);
    }
  }

  getCode(c: any) {
    if ("0" <= c && c <= "9") {
      return c.charCodeAt(0) - "0".charCodeAt(0);
    } else if ("A" <= c && c <= "Z") {
      return c.charCodeAt(0) - "A".charCodeAt(0) + 10;
    } else {
      switch (c) {
        case " ":
          return 36;
        case "$":
          return 37;
        case "%":
          return 38;
        case "*":
          return 39;
        case "+":
          return 40;
        case "-":
          return 41;
        case ".":
          return 42;
        case "/":
          return 43;
        case ":":
          return 44;
        default:
          throw "illegal char :" + c;
      }
    }
  }
}

//---------------------------------------------------------------------
// qr8BitByte
//---------------------------------------------------------------------

class qr8BitByte {
  _mode: any;
  _data: any;
  _bytes: any;

  constructor(data: any) {
    this._mode = QRMode.MODE_8BIT_BYTE;
    this._data = data;
    this._bytes = qrcode.stringToBytes(data);
  }

  getMode() {
    return this._mode;
  }

  getLength(buffer: any) {
    return this._bytes.length;
  }

  write(buffer: any) {
    for (var i = 0; i < this._bytes.length; i += 1) {
      buffer.put(this._bytes[i], 8);
    }
  }
}

//---------------------------------------------------------------------
// qrKanji
//---------------------------------------------------------------------

class qrKanji {
  _mode: any;
  _data: any;
  _bytes: any;

  constructor(data: any) {
    this._mode = QRMode.MODE_KANJI;
    this._data = data;

    //var stringToBytes: any = qrcode.stringToBytesFuncs["SJIS"];
    //if (!stringToBytes) {
    //  throw "sjis not supported.";
    //}

    this._bytes = qrcode.stringToBytes(data);
  }

  getMode() {
    return this._mode;
  }

  getLength(buffer: any) {
    return ~~(this._bytes.length / 2);
  }

  write(buffer: any) {
    var data = this._bytes;

    var i = 0;

    while (i + 1 < data.length) {
      var c = ((0xff & data[i]) << 8) | (0xff & data[i + 1]);

      if (0x8140 <= c && c <= 0x9ffc) {
        c -= 0x8140;
      } else if (0xe040 <= c && c <= 0xebbf) {
        c -= 0xc140;
      } else {
        throw "illegal char at " + (i + 1) + "/" + c;
      }

      c = ((c >>> 8) & 0xff) * 0xc0 + (c & 0xff);

      buffer.put(c, 13);

      i += 2;
    }

    if (i < data.length) {
      throw "illegal char at " + (i + 1);
    }
  }
}

//=====================================================================
// GIF Support etc.
//

//---------------------------------------------------------------------
// byteArrayOutputStream
//---------------------------------------------------------------------

class byteArrayOutputStream {
  _bytes: any = [];

  constructor() {}

  writeByte(b: any) {
    this._bytes.push(b & 0xff);
  }

  writeShort(i: any) {
    this.writeByte(i);
    this.writeByte(i >>> 8);
  }

  writeBytes(b: any, off: any, len: any) {
    off = off || 0;
    len = len || b.length;
    for (var i = 0; i < len; i += 1) {
      this.writeByte(b[i + off]);
    }
  }

  writeString(s: any) {
    for (var i = 0; i < s.length; i += 1) {
      this.writeByte(s.charCodeAt(i));
    }
  }

  toByteArray() {
    return this._bytes;
  }

  toString() {
    var s = "";
    s += "[";
    for (var i = 0; i < this._bytes.length; i += 1) {
      if (i > 0) {
        s += ",";
      }
      s += this._bytes[i];
    }
    s += "]";
    return s;
  }
}

//---------------------------------------------------------------------
// base64EncodeOutputStream
//---------------------------------------------------------------------

class base64EncodeOutputStream {
  _buffer = 0;
  _buflen = 0;
  _length = 0;
  _base64 = "";

  constructor() {}

  writeEncoded(b: any) {
    this._base64 += String.fromCharCode(this.encode(b & 0x3f));
  }

  encode(n: any) {
    if (n < 0) {
      // error.
    } else if (n < 26) {
      return 0x41 + n;
    } else if (n < 52) {
      return 0x61 + (n - 26);
    } else if (n < 62) {
      return 0x30 + (n - 52);
    } else if (n == 62) {
      return 0x2b;
    } else if (n == 63) {
      return 0x2f;
    }
    throw "n:" + n;
  }

  writeByte(n: any) {
    this._buffer = (this._buffer << 8) | (n & 0xff);
    this._buflen += 8;
    this._length += 1;

    while (this._buflen >= 6) {
      this.writeEncoded(this._buffer >>> (this._buflen - 6));
      this._buflen -= 6;
    }
  }

  flush() {
    if (this._buflen > 0) {
      this.writeEncoded(this._buffer << (6 - this._buflen));
      this._buffer = 0;
      this._buflen = 0;
    }

    if (this._length % 3 != 0) {
      // padding
      var padlen = 3 - (this._length % 3);
      for (var i = 0; i < padlen; i += 1) {
        this._base64 += "=";
      }
    }
  }

  toString() {
    return this._base64;
  }
}

//---------------------------------------------------------------------
// base64DecodeInputStream
//---------------------------------------------------------------------

class base64DecodeInputStream {
  _str: any;
  _pos = 0;
  _buffer = 0;
  _buflen = 0;

  constructor(str: any) {
    this._str = str;
    this._pos = 0;
    this._buffer = 0;
    this._buflen = 0;
  }

  read() {
    while (this._buflen < 8) {
      if (this._pos >= this._str.length) {
        if (this._buflen == 0) {
          return -1;
        }
        throw "unexpected end of file./" + this._buflen;
      }

      var c = this._str.charAt(this._pos);
      this._pos += 1;

      if (c == "=") {
        this._buflen = 0;
        return -1;
      } else if (c.match(/^\s$/)) {
        // ignore if whitespace.
        continue;
      }

      this._buffer = (this._buffer << 6) | this.decode(c.charCodeAt(0));
      this._buflen += 6;
    }

    var n = (this._buffer >>> (this._buflen - 8)) & 0xff;
    this._buflen -= 8;
    return n;
  }

  decode(c: any) {
    if (0x41 <= c && c <= 0x5a) {
      return c - 0x41;
    } else if (0x61 <= c && c <= 0x7a) {
      return c - 0x61 + 26;
    } else if (0x30 <= c && c <= 0x39) {
      return c - 0x30 + 52;
    } else if (c == 0x2b) {
      return 62;
    } else if (c == 0x2f) {
      return 63;
    } else {
      throw "c:" + c;
    }
  }
}

//---------------------------------------------------------------------
// gifImage (B/W)
//---------------------------------------------------------------------
class bitOutputStream {
  _out: any;
  _bitLength: number = 0;
  _bitBuffer: number = 0;

  constructor(out: any) {
    this._out = out;
    this._bitLength = 0;
    this._bitBuffer = 0;
  }

  write(data: any, length: number) {
    if (data >>> length != 0) {
      throw "length over";
    }

    while (this._bitLength + length >= 8) {
      this._out.writeByte(0xff & ((data << this._bitLength) | this._bitBuffer));
      length -= 8 - this._bitLength;
      data >>>= 8 - this._bitLength;
      this._bitBuffer = 0;
      this._bitLength = 0;
    }

    this._bitBuffer = (data << this._bitLength) | this._bitBuffer;
    this._bitLength = this._bitLength + length;
  }

  flush() {
    if (this._bitLength > 0) {
      this._out.writeByte(this._bitBuffer);
    }
  }
}

class lzwTable {
  _map: any = {};
  _size: any = 0;

  constructor() {}

  add(key: any) {
    if (this.contains(key)) {
      throw "dup key:" + key;
    }
    this._map[key] = this._size;
    this._size += 1;
  }

  size() {
    return this._size;
  }

  indexOf(key: any) {
    return this._map[key];
  }

  contains(key: any) {
    return typeof this._map[key] != "undefined";
  }
}

class gifImage {
  _width: any;
  _height: any;
  _data: any;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._data = new Array(width * height);
  }

  setPixel(x: number, y: number, pixel: number) {
    this._data[y * this._width + x] = pixel;
  }

  write(out: any) {
    //---------------------------------
    // GIF Signature

    out.writeString("GIF87a");

    //---------------------------------
    // Screen Descriptor

    out.writeShort(this._width);
    out.writeShort(this._height);

    out.writeByte(0x80); // 2bit
    out.writeByte(0);
    out.writeByte(0);

    //---------------------------------
    // Global Color Map

    // black
    out.writeByte(0x00);
    out.writeByte(0x00);
    out.writeByte(0x00);

    // white
    out.writeByte(0xff);
    out.writeByte(0xff);
    out.writeByte(0xff);

    //---------------------------------
    // Image Descriptor

    out.writeString(",");
    out.writeShort(0);
    out.writeShort(0);
    out.writeShort(this._width);
    out.writeShort(this._height);
    out.writeByte(0);

    //---------------------------------
    // Local Color Map

    //---------------------------------
    // Raster Data

    var lzwMinCodeSize = 2;
    var raster = this.getLZWRaster(lzwMinCodeSize);

    out.writeByte(lzwMinCodeSize);

    var offset = 0;

    while (raster.length - offset > 255) {
      out.writeByte(255);
      out.writeBytes(raster, offset, 255);
      offset += 255;
    }

    out.writeByte(raster.length - offset);
    out.writeBytes(raster, offset, raster.length - offset);
    out.writeByte(0x00);

    //---------------------------------
    // GIF Terminator
    out.writeString(";");
  }

  getLZWRaster(lzwMinCodeSize: number) {
    var clearCode = 1 << lzwMinCodeSize;
    var endCode = (1 << lzwMinCodeSize) + 1;
    var bitLength = lzwMinCodeSize + 1;

    // Setup LZWTable
    var table = new lzwTable();

    for (var i = 0; i < clearCode; i += 1) {
      table.add(String.fromCharCode(i));
    }
    table.add(String.fromCharCode(clearCode));
    table.add(String.fromCharCode(endCode));

    var byteOut = new byteArrayOutputStream();
    var bitOut = new bitOutputStream(byteOut);

    // clear code
    bitOut.write(clearCode, bitLength);

    var dataIndex = 0;

    var s = String.fromCharCode(this._data[dataIndex]);
    dataIndex += 1;

    while (dataIndex < this._data.length) {
      var c = String.fromCharCode(this._data[dataIndex]);
      dataIndex += 1;

      if (table.contains(s + c)) {
        s = s + c;
      } else {
        bitOut.write(table.indexOf(s), bitLength);

        if (table.size() < 0xfff) {
          if (table.size() == 1 << bitLength) {
            bitLength += 1;
          }

          table.add(s + c);
        }

        s = c;
      }
    }

    bitOut.write(table.indexOf(s), bitLength);

    // end code
    bitOut.write(endCode, bitLength);

    bitOut.flush();

    return byteOut.toByteArray();
  }
}

export default qrcode;
