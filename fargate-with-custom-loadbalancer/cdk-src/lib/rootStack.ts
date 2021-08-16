import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import { Vpc, SecurityGroup } from '@aws-cdk/aws-ec2'
import * as ecs from '@aws-cdk/aws-ecs'
import { Cluster } from '@aws-cdk/aws-ecs'
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets'
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2'
import { CONFIG } from '../config'

 
export class RootStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id:string, props?: cdk.StackProps) {

        super(scope, id, props)

        // get default vpc
        const vpc = Vpc.fromLookup(this, 'VPC', { 
            isDefault : true 
        })
        
        /** 
         * ------- @CONFIGURE_SECURITY_GROUP ------- 
         */
        // get security group
        const sg = SecurityGroup.fromSecurityGroupId(
            this, 
            'securitygroup-id', 
            CONFIG.STACK.SECURITY_GROUP_ID
        )

        /** 
         * ------- @CONFIGURE_CLUSTER ------- 
         */
        // get cluster
        const cluster = Cluster.fromClusterAttributes(
            this,
            'cluster-id',
            { 
                clusterName    : CONFIG.STACK.CLUSTER_NAME, 
                securityGroups : [sg],
                vpc,
            }
        )

        
        /** 
         * ------- @CREATE_FARGATE_SERVICE ------- 
         */

        // create task definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, `${CONFIG.STACK.SERVICE_NAME}-fargate-task-definition`, {
            memoryLimitMiB : 512,
            cpu: 256,
        })
        // Define container spec and add into task definition
        const container = taskDefinition.addContainer(`${CONFIG.STACK.SERVICE_NAME}-fargate-service-container`, {
            image : ecs.ContainerImage.fromDockerImageAsset(
                new DockerImageAsset(
                    this, 
                    `${CONFIG.STACK.SERVICE_NAME}-docker-image-asset`,
                    {
                        directory: path.resolve(__dirname, "../.."),
                        exclude: ["cdk", "cdk.out"],
                        repositoryName: `${CONFIG.STACK.SERVICE_NAME}-image-repo`,
                    }
                )
            )
        })
        // create fargate service
        const fargateService = new ecs.FargateService(this, `${CONFIG.STACK.SERVICE_NAME}-service`, {
            cluster,
            taskDefinition,
            desiredCount : 2,
            serviceName  : `${CONFIG.STACK.SERVICE_NAME}-service`,
            assignPublicIp : false,
            securityGroups : [sg],
        })
        // map port
        container.addPortMappings({
            containerPort : CONFIG.STACK.CONTAINER_PORT
        })
        // get listener
        const listener = elbv2.ApplicationListener.fromApplicationListenerAttributes(this, 'listener-id', {
            listenerArn : CONFIG.STACK.LISTENER_ARN,
            securityGroup : sg
        })
        // create target group
        const tg = new elbv2.ApplicationTargetGroup(this, `${CONFIG.STACK.SERVICE_NAME}-target-group`, {
            vpc,
            targetGroupName : `${CONFIG.STACK.SERVICE_NAME}-target-group`,
            port        : 80,
            healthCheck : {
                // ⚠️⚠️⚠️ Make sure the  healthcheck path is functional
                // otherwise tasks will keep respawn and you will always receive 502 from your load balancer
                path     : "/",
                interval : cdk.Duration.seconds(60),
                timeout  : cdk.Duration.seconds(3)
            },
            targets : [fargateService],
        })
        // add to listener
        listener.addTargetGroups(`${CONFIG.STACK.SERVICE_NAME}-target-groups`, {
            priority : CONFIG.STACK.RULE_PRIORITY,
            targetGroups : [tg],
            conditions : [
                // All traffics will be forwarded to this target group
                elbv2.ListenerCondition.pathPatterns(['*'])
            ]
        })


        /** 
         * ------- @SETUP_AUTO_SCALING_POLICY ------- 
         */
        const scaling = fargateService.autoScaleTaskCount({ maxCapacity : 6 })
        // set auto scaling critiria
        scaling.scaleOnCpuUtilization(`${CONFIG.STACK.SERVICE_NAME}-fargate-cpu-scaling`, {
            targetUtilizationPercent : 70,
            scaleInCooldown          : cdk.Duration.seconds(60),
            scaleOutCooldown         : cdk.Duration.seconds(60)
        })

        // set alb dns to stack outpus
        new cdk.CfnOutput(this, `${CONFIG.STACK.SERVICE_NAME}-load-balancer-DNS`, { value : CONFIG.STACK.ALB_DNS })

    }

}
