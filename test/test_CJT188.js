/**
 * Created by zhuqizhong on 17-8-27.
 */
const assert = require("assert");
const Q = require('q');
const driver = require('../index');
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
                    "010101010101":"CJT188"
            }})

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
                }

            })
        })
    })
});