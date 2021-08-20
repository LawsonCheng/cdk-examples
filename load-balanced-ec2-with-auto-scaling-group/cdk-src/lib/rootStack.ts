import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as ecs from '@aws-cdk/aws-ecs'
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets'
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2'
import { CONFIG } from '../config'

 
export class RootStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id:string, props?: cdk.StackProps) {
        super(scope, id, props)
        // get default vpc
        const vpc = ec2.Vpc.fromLookup(this, 'VPC', { 
            isDefault : true 
        })
        // get security group
        const sg = ec2.SecurityGroup.fromSecurityGroupId(
            this, 
            'fargate-securitygroup', 
            CONFIG.STACK.SECURITY_GROUP_ID
        )
        // create cluster
        const cluster = new ecs.Cluster(this, `${CONFIG.STACK.CLUSTER_NAME}-cluster`, {
            vpc,
            clusterName : `${CONFIG.STACK.CLUSTER_NAME}-cluster`,
            containerInsights : false,
        })
        const autoScalingGroup = cluster.addCapacity('default-auto-scaling-group', {
            instanceType :  ec2.InstanceType.of(
                ec2.InstanceClass.T2, 
                ec2.InstanceSize.MICRO
            ),
            machineImage : ecs.EcsOptimizedImage.amazonLinux2(),
            minCapacity : 1,
            maxCapacity : 3
        })
        // keep up to 80% loaded, if execeed 80% launch more intances
        autoScalingGroup.scaleOnCpuUtilization('keep-cpu-80-percent-loaded', {
            targetUtilizationPercent : 80,
        })
        // create task definition
        const taskDefinition = new ecs.Ec2TaskDefinition(this, `${CONFIG.STACK.CLUSTER_NAME}-ec2-task-definition`,{
            networkMode : ecs.NetworkMode.AWS_VPC,
            placementConstraints: [ecs.PlacementConstraint.memberOf("attribute:ecs.instance-type == t2.micro"),],
        })
        // define container spec inside task
        const container = taskDefinition.addContainer(`${CONFIG.STACK.CLUSTER_NAME}-ec2-service-container`, {
            memoryLimitMiB : 512,
            cpu : 256,
            image : ecs.ContainerImage.fromDockerImageAsset(
                new DockerImageAsset(this, `${CONFIG.STACK.CLUSTER_NAME}-docker-image-asset`,{
                    directory: path.resolve(__dirname, "../.."),
                    exclude: ["cdk", "cdk.out"],
                    repositoryName: `${CONFIG.STACK.CLUSTER_NAME}-image-repo`,
                })
            )
        })
        // add port mapping
        container.addPortMappings({
            containerPort : CONFIG.STACK.CONTAINER_PORT
        })
        // define EC2 service
        const ec2Service = new ecs.Ec2Service(this, `${CONFIG.STACK.CLUSTER_NAME}-ec2-service`, {
            cluster,
            taskDefinition,
            desiredCount : 1,
            serviceName  : `${CONFIG.STACK.CLUSTER_NAME}-service`,
            assignPublicIp : false,
            securityGroups : [sg],
            minHealthyPercent : 50,
        })
        // get listener
        const listener = elbv2.ApplicationListener.fromApplicationListenerAttributes(this, 'alb-listener', {
            listenerArn : CONFIG.STACK.LISTENER_ARN,
            securityGroup : sg
        })
        console.log('----> Listener found, ARN: ', listener.listenerArn)
        // create target group
        const tg = new elbv2.ApplicationTargetGroup(this, `${CONFIG.STACK.CLUSTER_NAME}-target-group`, {
            vpc,
            targetGroupName : `${CONFIG.STACK.CLUSTER_NAME}-target-group`,
            port        : 80,
            healthCheck : {
                path     : "/",
                interval : cdk.Duration.seconds(60),
                timeout  : cdk.Duration.seconds(3)
            },
            targets : [ec2Service],
        })
        console.log('-----> Target Group created')

        // add to listener
        listener.addTargetGroups(`${CONFIG.STACK.CLUSTER_NAME}-target-groups`, {
            priority : CONFIG.STACK.RULE_PRIORITY,
            targetGroups : [tg],
            conditions : [
                // All traffics will be forwarded to this target group
                elbv2.ListenerCondition.pathPatterns(['*'])
            ]
        })
        console.log('-----> Target Group added to listener, ARN: ', listener.listenerArn)

        // set dns value to stack outputs
        new cdk.CfnOutput(this, `${CONFIG.STACK.CLUSTER_NAME}-load-balancer-DNS`, { 
            value : CONFIG.STACK.ALB_DNS
        })
    }

}
