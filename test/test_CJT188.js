/**
 * Created by zhuqizhong on 17-8-27.
 */
const assert = require("assert");
const Q = require('q');
const driver = require('../index');
const driver_net = require('../index');
const net  = require('net');
const _ = require('lodash');
const readline = require('readline');
var result_test;

const SerialPort = require('serialport');

describe('CJT188 Test', function(){
    describe('On Serial Port Test', function(){
        it('init driver', function(done){
            driver.initDriver({serial:{
                path:'/dev/ttyUSB0',
                opts:{
                    baudRate:9600
                },
            },sids:{
                "01800914000000":"CJT188"
            }})

            driver.EpsInit("01800914000000",{"1":["01800914000000:WQ.1"],"2":["01800914000000:WQ.2"],"3":["01800914000000:WQ.3"],"4":["01800914000000:WQ.4"]})
            done();
        });


        it('receive data from port',(done)=>{
            let _conSerial = new SerialPort('/dev/ttyUSB1',{baudRate:9600},function(err){
                if(err){
                    throw new Error(err);
                }else{
                    console.log('opend')
                    let buff = [0x68,0x10,0x01,0x80,0x09,0x14,0x00,0x00,0x00,0x81,0x0e,0x90,0x22,0x00,0x44,0x33,0x22,0x11,0x78,0x56,0x34,0x12,0x24,0x04,0x00,0x3d,0x16];
                    _conSerial.write(buff);
                    _conSerial.drain(function(){

                    })

                    setTimeout(()=>{
                        _conSerial.close();
                        if(driver.readRegValues["01800914000000:WQ.1"] === 123456.78 && driver.readRegValues["01800914000000:WQ.2"] === 1122.3344
                             && driver.readRegValues["01800914000000:WQ.3"] === 3.6 && driver.readRegValues["01800914000000:WQ.4"] === false){
                            done();
                        }else{
                            throw new Error(JSON.stringify(driver.readRegValues));
                        }
                    },1000);
                }

            })
        });

        it('error and restore from port',(done)=>{
            let _conSerial = new SerialPort('/dev/ttyUSB1',{baudRate:9600},function(err){
                if(err){
                    throw new Error(err);
                }else{


                    console.log('please plug off /dev/ttyUSB0\r\n');
                    Q().then(()=>{
                        let defer = Q.defer();
                        let timeHandle = setInterval(()=>{
                            const exec = require('child_process').exec;
                            exec('ls /dev/ttyUSB0', (error, stdout, stderr) => {
                                if (error) {
                                    clearInterval(timeHandle);
                                    defer.resolve();
                                }else{
                                    console.log('please plug off /dev/ttyUSB0\r\n');
                                    console.log(`stdout: ${stdout}`);
                                    console.log(`stderr: ${stderr}`);
                                }

                            });

                        },500);
                        return defer.promise;
                    }).then(()=>{
                        console.log('please plug off /dev/ttyUSB0\r\n');
                        let defer = Q.defer();
                        let timeHandle = setInterval(()=>{
                            const exec = require('child_process').exec;
                            exec('ls /dev/ttyUSB0', (error, stdout, stderr) => {
                                if (error) {
                                    console.log('please plug in /dev/ttyUSB0\r\n');
                                }else{

                                    clearInterval(timeHandle);
                                    defer.resolve();
                                }

                            });

                        },500);
                        return defer.promise;
                    }).delay(5000).then(()=>{
                        let buff = [0x68,0x10,0x01,0x80,0x09,0x14,0x00,0x00,0x00,0x81,0x0e,0x90,0x22,0x00,0x44,0x33,0x22,0x11,0x78,0x56,0x34,0x12,0x24,0x04,0x00,0x3d,0x16];
                        _conSerial.write(buff);
                        _conSerial.drain(function(){

                        })

                        setTimeout(()=>{
                            if(driver.readRegValues["01800914000000:WQ.1"] === 123456.78 && driver.readRegValues["01800914000000:WQ.2"] === 1122.3344
                                && driver.readRegValues["01800914000000:WQ.3"] === 3.6 && driver.readRegValues["01800914000000:WQ.4"] === false){
                                done();
                            }else{
                                throw new Error(JSON.stringify(driver.readRegValues));
                            }
                        },1000);
                    })

                    let rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    rl.question('please plug off /dev/ttyUSB0, press Y to continue? ', (answer) => {


                            rl.question('please plug in /dev/ttyUSB0, press enter to continue? ', (answer) => {

                                let tick = 6;
                                let timeHandle = setInterval(()=>{
                                    if(tick > 0){
                                        console.log(`\r${tick}`);
                                        tick--;
                                        if(tick === 0){
                                            clearInterval(timeHandle);

                                        }
                                    }

                                },1000)
                            });


                    });

                }

            })
        })
    })

    describe('On network Test', function(){
        let net_server,clientSockets=[];
        before("create Server",function(done){
            net_server = net.createServer((socket) => {
                clientSockets.push(socket);
            }).on('error', (err) => {
                // handle errors here
                throw err;
            });

// grab a random port.
            net_server.listen(3322,() => {
                console.log('opened server on', net_server.address());
                done();
            });

        })
        it('init driver', function(done){
            driver_net.initDriver({net:{
                ip:"127.0.0.1",
                port:3322,
            },sids:{
                "01800914000000":"CJT188"
            }})

            driver_net.EpsInit("01800914000000",{"1":["01800914000000:WQ.1"],"2":["01800914000000:WQ.2"],"3":["01800914000000:WQ.3"],"4":["01800914000000:WQ.4"]})
            done();
        });


        it('receive data from port',(done)=>{
            setTimeout(()=> {
                _.each(clientSockets, (socket) => {
                    let buff = [0x68, 0x10, 0x01, 0x80, 0x09, 0x14, 0x00, 0x00, 0x00, 0x81, 0x0e, 0x90, 0x22, 0x00, 0x44, 0x33, 0x22, 0x11, 0x78, 0x56, 0x34, 0x12, 0x24, 0x04, 0x00, 0x3d, 0x16];
                    socket.write(new Buffer(buff));
                });

                setTimeout(() => {
                    if (driver_net.readRegValues["01800914000000:WQ.1"] === 123456.78 && driver_net.readRegValues["01800914000000:WQ.2"] === 1122.3344
                        && driver_net.readRegValues["01800914000000:WQ.3"] === 3.6 && driver_net.readRegValues["01800914000000:WQ.4"] === false) {
                        done();
                    } else {
                        throw new Error(JSON.stringify(driver_net.readRegValues));
                    }
                }, 1500);
            },1000);
        })


        it('test reconnected',(done)=>{
            _.each(clientSockets, (socket) => {
              socket.end();
            });
            clientSockets=[];
            setTimeout(()=> {
                _.each(clientSockets, (socket) => {
                    let buff = [0x68, 0x10, 0x01, 0x80, 0x09, 0x14, 0x00, 0x00, 0x00, 0x81, 0x0e, 0x90, 0x22, 0x00, 0x44, 0x33, 0x22, 0x11, 0x79, 0x56, 0x34, 0x12, 0x24, 0x04, 0x00, 0x3e, 0x16];
                    socket.write(new Buffer(buff));
                });

                setTimeout(() => {
                    if (driver_net.readRegValues["01800914000000:WQ.1"] === 123456.79 && driver_net.readRegValues["01800914000000:WQ.2"] === 1122.3344
                        && driver_net.readRegValues["01800914000000:WQ.3"] === 3.6 && driver_net.readRegValues["01800914000000:WQ.4"] === false) {
                        done();
                    } else {
                        throw new Error(JSON.stringify(driver_net.readRegValues));
                    }
                }, 1500);
            },4000);
        })
    })
});