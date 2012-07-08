function Buffer(subject, encoding, offset){
	var length;
	if(offset) throw "Nonzero offsets not supported";

	if(typeof subject == 'number'){
		length = subject;
	}else if(subject.pop){ //array-like
		length = subject.length;
	}else{
		encoding = (encoding || 'utf8').toLowerCase().replace("-", '');
		length = Buffer.byteLength(subject, encoding)
	}

	this.length = length;
	if(subject.pop){ //array-like
		this.array = new Uint8Array(subject);	
	}else{
		this.array = new Uint8Array(length);	
		if(encoding){
			this.write(subject, 0, encoding)
		}
	}
	//console.log("creating buffer", arguments)
}

Buffer.prototype.write = function(string, offset, encoding){
	encoding = (encoding || 'utf8').toLowerCase().replace("-", '');
	if(typeof string != 'string') throw "trying to write non-string";
	if(encoding == 'utf8'){
		this.array.set(utf8tobytes(string), offset);
	}else if(encoding == 'ascii'){
		this.array.set(asciitobytes(string), offset);
	}else if(encoding == 'hex'){
		if(string.length % 2 != 0) throw "Unexpected non-integer length from hex";
		for(var i = 0; i < string.length; i += 2){
			this.array[offset + (i/2)] = parseInt(string.substr(i, 2), 16);
		}
	}
	//console.log("writing", arguments);
}

Buffer.prototype.copy = function(target, target_start, start, end) {
	if(!(target instanceof Buffer)) throw "Target is not a buffer";
	target.array.set(this.array.subarray(start, end), target_start)
};

Buffer.prototype.toArrayBuffer = function(){
	return this.array.buffer;
}

Buffer.byteLength = function(string, encoding){
	encoding = (encoding || 'utf8').toLowerCase().replace("-", '');
	if(encoding == 'hex'){
		if(string.length % 2 != 0) throw "Unexpected non-integer length from hex";
		return string.length / 2;
	}else if(encoding == 'utf8'){
		return utf8tobytes(string).length;	
	}else{
		throw "Encoding "+encoding+" is not supported"
	}
	
}

function asciitobytes(string){
	return new Uint8Array(string.split('').map(function(e){
		return e.charCodeAt(0)
	}))
}

function utf8tobytes(string) {
  var j, buffer = [];
	for(var a = 0; a < string.length; a++){
		var value = string.charCodeAt(a);
		if(value <= 0x7F){
			buffer.push(value);
		} else if(value <= 0x7FF){
			buffer.push(0xC0 | (value >>> 6));
			buffer.push(0x80 | (value & 0x3F));
		} else if(value <= 0xFFFF){
			buffer.push(0xE0 | (value >>> 12));
			buffer.push(0x80 | ((value >>> 6) & 0x3F));
			buffer.push(0x80 | (value & 0x3F));
		} else {
			j = 4;
			while(value >> (6 * j)) j++;
				buffer.push(((0xFF00 >>> j) & 0xFF) | (value >>> (6 * --j)));
			while(j--)
				buffer.push(0x80 | ((value >>> (6 * j)) & 0x3F));
		}
	}
	return new Uint8Array(buffer);
}