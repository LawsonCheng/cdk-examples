#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RootStack } from '../lib/rootStack';
import { CONFIG } from '../config';

const app = new cdk.App();
new RootStack(app, CONFIG.STACK.NAME , {
    env : {
        region  : CONFIG.AWS.REGION,
        account : CONFIG.AWS.ACCOUNT_ID
    }
});
app.synth();