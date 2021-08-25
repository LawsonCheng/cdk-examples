import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as apigw from '@aws-cdk/aws-apigateway'
import { CONFIG } from '../config'
 
export class RootStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id:string, props?: cdk.StackProps) {
        super(scope, id, props)

        // create lambda function
        const lambdaFunction = new lambda.Function(this, 'lambda-function', {
            runtime : lambda.Runtime.NODEJS_14_X,
            /**
             * For GitHub workflow + continuous delivery, 
             * your might compress it by the following command and the zip file will be placed under project root
             * > zip -r -q ../bundle.zip ./*
             */
            code    : lambda.Code.fromAsset(path.join(__dirname, "../../bundle.zip")),
            handler : 'index.handler'
        })
        // create api gateway
        const api =  new apigw.LambdaRestApi(this, 'api-gateway', {
            restApiName                 : CONFIG.STACK.API_NAME,
            handler                     : lambdaFunction,
            // configure you cors settings here
            defaultCorsPreflightOptions : {
                allowHeaders     : [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                ],
                allowMethods     : ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                allowCredentials : true,
                allowOrigins     : ['*'],
            },
        })
        // set output values to the stack
        new cdk.CfnOutput(this, 'api-endpoint', { value : api.url })
    }

}
