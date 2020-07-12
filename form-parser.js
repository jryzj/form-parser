const url = require('url');

module.exports = {
  ctMp: 'multipart/form-data',
  ctTp: 'text/plain',
  ctAX: 'application/x-www-form-urlencoded',
  formParse: function (request, postdata) {
    let mt = request.method.toUpperCase();
    let ct = request.headers['content-type'];
    let params;

    if (mt == 'POST') {
      //post method
      params = this.postBodyparse(request, postdata);
      switch (true) {
        case ct.indexOf(this.ctTp): {
          //text/plain
          let kvs = params[0].value.split('\r\n');
          params = [];
          kvs.forEach((element) => {
            let ekv = element.split('=');
            params.push({ [ekv[0]]: ekv[1] });
          });
          break;
        }
        case ct.indexOf(this.ctAX): {
          //application/x-www-form-urlencoded
          let kvs = params[0].value.split('&');
          params = [];
          kvs.forEach((element) => {
            let ekv = element.split('=');
            params.push({ [ekv[0]]: ekv[1] });
          });
          break;
        }
      }
    } else {
      //get method
      let kvs = url.parse(request.url, true).query;
      for (let ekv in kvs) {
        params = [];
        params.push(ekv);
      }
    }
    return params;
  },
  postBodyparse: function (request, postdata) {
    //传入的postdata是Buffer的类型
    //postdata is Buffer type

    if (typeof postdata != 'string') {
      postdata = postdata.toString();
    } //复制一个字符串副本，以便后面使用字符串方法。
    //convert postdata to string

    //获取request的headers属性的content-type中的boundary定义。
    //get the boundary index in content-type of head
    let index = request['headers']['content-type'].indexOf('boundary=');

    //在接受到的拼接数据中，boundary前面多个‘--’，在整个数据最后也多个‘--’
    //get the boundary, and add '--' before and after boundary, which is real seperator.
    let boundary =
      '--' + request['headers']['content-type'].substring(index + 9);

    let postArray = postdata.split(boundary); //用字符串的split方法分割数据，获得数组。 use boundary to split
    /*
          分割后的数组结构例子如下。
          //the array after split
          [ '',
          '\r\nContent-Disposition: form-data; name="filename"\r\n\r\nsavapic\r\n',
          '\r\nContent-Disposition: form-data; name="file"; filename="Computer_Monitor_128px_566914_easyicon.net.png"\r\nContent-Type: image/png\r\n\r\nPNG\r\n\u001a\n\u0000\u0000\u0000\rIHDR\u0000\u0000\u0000\u0000\u0000\u0000
          '\r\nContent-Disposition: form-data; name="btn-submit"\r\n\r\næäº¤\r\n',
          '--\r\n' ]
           */

    let params = []; //用于装解析后要返回的request数据，内含的每一项都是对象。array to save data after parsing
    let l = postArray.length;
    let code;
    let postPhrase = ''; //用于装数组中的单条数据，用于解析。save template data in array
    for (let i = 1; i < l; i++) {
      let paramObj = {}; //用于装解析后的对象数据。save data after parsing
      postPhrase = postArray[i];
      if (postPhrase.length != 0 && postPhrase != '--\r\n') {//filter nosense data
        //排除掉上面分割后的数组中的无用数据。

        //获得formdata中input的name及值。放在paramObj.name中
        let position = postPhrase.indexOf('name='); //先定位到name，然后获取后面双引号中值。get name index
        if (position != -1) {
          position += 6; //调整到值的位置偏移，name="的长度是6。adjust index to value
          paramObj.name = '';
          while ((code = postPhrase.charAt(position)) !== '"') {
            //逐个取出值的字母。get character at the index posistion
            paramObj.name += code;
            position++;
          }
        }

        //获得formdata中input的Content-Type值，放在paramObj.ContentType中。get content-type
        position = postPhrase.indexOf('Content-Type:'); //先定位到Content-Type:，然后取后面的值。get 'Content-Type' index
        if (position != -1) {
          position += 14; //调整到值的位置偏移，Content-Type:及一个空格长度是14。adjust index to content-type value
          paramObj['content-type'] = '';
          while ((code = postPhrase.charAt(position)) != '\r') {
            //逐个取出值的字母。get character at the index posistion
            paramObj.ContentType += code;
            position++;
          }

          //如果是文件，表单的数据中还有文件名，可以取出。get filename if available. method is same as above.
          paramObj.filename = ''; 
          position = postPhrase.indexOf('filename') + 10; //定位到filename，然后调整偏移到值的位置。filename="的长度是10
          while ((code = postPhrase.charAt(position)) != '"') {
            //逐个取出值的字母
            paramObj.filename += code;
            position++;
          }
        }
        //获取数据，如果是文件是以二进制形式拼在request中的
        let p1 = postPhrase.indexOf('\r\n\r\n') + 4; //再跳过后面的4个回车换行符，这个位置作为文件数据的开始位置
        let p2 = postPhrase.length - 2; //分割的出的单条数据是以\r\n结束的，也需要去掉。
        paramObj.value = postPhrase.slice(p1, p2); //从单条数据中取出文件的数据，存到paramObj.value

        //如果要获取其他类型的信息，先把request的post数据打印出来，然后分析获取。
        params.push(paramObj);
      }
    }
    return params; //返回一个对象数组
  },
};
