
Independent TIFF fixtures generated with Pillow for development only.
Runtime and tests use only Node built-ins; no Pillow installation is required.
97x37 pixel values:
L: (i*137 + floor(i/7)*53) % 251
I;16: (i*1597) % 65536
F: ((i*23) % 311)/17 + 0.25, encoded float32.
Four TIFF compression settings: raw, tiff_lzw, packbits, tiff_adobe_deflate.
big-endian.tif: uint16 3x2, [1,256,65535,7,8,9] in TIFF row order.
