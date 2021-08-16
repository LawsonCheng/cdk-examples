import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import { Vpc, SecurityGroup, Peer, Port } from '@aws-cdk/aws-ec2'
import * as ecs from '@aws-cdk/aws-ecs'
import { Cluster } from '@aws-cdk/aws-ecs'
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets'
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns'
import { CONFIG } from '../config'

 
export class RootStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id:string, props?: cdk.StackProps) {

        super(scope, id, props)

        // get default vpc
        const vpc = Vpc.fromLookup(this, 'VPC', { 
            isDefault : true 
        })

        // create docker image asset
        const asset = new DockerImageAsset(this, `${CONFIG.STACK.CLUSTER_NAME}-docker-image-asset`, {
            directory: path.resolve(__dirname, "../.."),
            exclude: ["cdk", "cdk.out"],
            repositoryName: `${CONFIG.STACK.CLUSTER_NAME}-image-repo`,
        })
        
        /** 
         * ------- @CONFIGURE_SECURITY_GROUP ------- 
         */
        // find security group
        let sg = SecurityGroup.fromSecurityGroupId(
            this, 
            'fargate-security-group', 
            CONFIG.STACK.SECURITY_GROUP_ID
        )
        // security group not found
        if(sg === undefined || !sg){
            // create one
            sg = new SecurityGroup(this, 'fargate-securitygroup', { 
                securityGroupName : 'fargate-sg',
                vpc
            })
            // !!! edit the rules according as your need !!!
            // add inbound rule
            sg.addIngressRule(Peer.anyIpv4(),Port.allTraffic(), 'All port range from anywhere')
            // add outbound rule
            sg.addEgressRule(Peer.anyIpv4(), Port.allTraffic(), 'All port range from anywhere')
        }

        /** 
         * ------- @CONFIGURE_CLUSTER ------- 
         */
        // get cluster
        let cluster = Cluster.fromClusterAttributes(this, 'ecs-cluster', { 
            clusterName    : CONFIG.STACK.CLUSTER_NAME, 
            securityGroups : [sg],
            vpc,
        })
        // no cluster found
        if(cluster === undefined || !cluster) {
            // create new cluster
            cluster = new Cluster(this, 'ecs-cluster',{
                vpc,
                clusterName : CONFIG.STACK.CLUSTER_NAME
            })
        }

        /** 
         * ------- @CREATE_FARGATE_SERVICE ------- 
         */
        const fargateService = new ApplicationLoadBalancedFargateService(
            this, 
            `${CONFIG.STACK.CLUSTER_NAME}-fargate-service`,
            {
                cluster,
                memoryLimitMiB : 512,
                cpu : 256,
                // number of tasks you want to run in a service
                desiredCount : 1,
                serviceName : `${CONFIG.STACK.CLUSTER_NAME}-service`,
                taskImageOptions : {
                    image         : ecs.ContainerImage.fromDockerImageAsset(asset),
                    containerPort : CONFIG.STACK.CONTAINER_PORT
                },
                assignPublicIp : true,
                securityGroups : [sg],
                publicLoadBalancer : true
            }
        )

        /** 
         * ------- @SETUP_AUTO_SCALING_POLICY ------- 
         */
        const scalingPolicy = fargateService.service.autoScaleTaskCount({ 
            minCapacity : 1,
            maxCapacity : 6
        })
        // set auto scaling critiria
        scalingPolicy.scaleOnCpuUtilization(`${CONFIG.STACK.CLUSTER_NAME}-fargate-cpu-scaling`, {
            targetUtilizationPercent : 70,
            scaleInCooldown          : cdk.Duration.seconds(60),
            scaleOutCooldown         : cdk.Duration.seconds(60)
        })
        // set load balancer dns to stack outputs
        new cdk.CfnOutput(this, `${CONFIG.STACK.CLUSTER_NAME}-load-balancer-DNS`, { 
            value : fargateService.loadBalancer.loadBalancerDnsName 
        })

    }

}
